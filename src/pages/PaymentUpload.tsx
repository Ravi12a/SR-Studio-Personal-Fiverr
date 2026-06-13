import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order } from '../types';
import { useAuth } from '../lib/auth';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';

export default function PaymentUpload() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!orderId) return;
    try {
      const docRef = doc(db, 'orders', orderId);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const fetchedOrder = { id: docSnap.id, ...docSnap.data() } as Order;
          if (fetchedOrder.clientId !== user?.uid) {
             navigate('/dashboard');
             return;
          }
          setOrder(fetchedOrder);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `orders/${orderId}`);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
       handleFirestoreError(error, OperationType.GET, `orders/${orderId}`);
       setLoading(false);
    }
  }, [orderId, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !user || !transactionId) {
      toast.error("Please enter the UTR number.");
      return;
    }
    setSubmitting(true);
    
    try {
      let screenshotUrl = null;
      if (file) {
        try {
          const storageRef = ref(storage, `payments/${user.uid}/${Date.now()}_${file.name}`);
          
          // Add timeout to prevent hanging on upload
          const uploadPromise = uploadBytes(storageRef, file);
          const timeoutPromise = new Promise((_, reject) => {
             setTimeout(() => reject(new Error("Upload timed out after 8 seconds.")), 8000);
          });
          
          const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
          screenshotUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadError) {
          console.error("Storage upload error:", uploadError);
          toast.error("Failed to upload screenshot, but proceeding with UTR.");
        }
      }

      const paymentData = {
        orderId: order.id,
        clientId: user.uid,
        transactionId,
        screenshotUrl,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      const newPaymentRef = doc(collection(db, 'payments'));
      setDoc(newPaymentRef, paymentData).catch((err) => console.error("Payment sync error:", err));
      
      toast.success("Payment details submitted successfully! We will review it shortly.");
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit payment details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center">Loading...</div>;
  if (!order) return <div className="min-h-screen flex justify-center items-center text-red-500">Order not found.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Complete Payment</h1>
        <p className="mt-2 text-slate-500">Please send ₹{order.amount} using the QR code below.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 mb-8 text-center">
        <div className="mx-auto flex justify-center mb-6">
          <img 
            src="https://res.cloudinary.com/dcjhzmkei/image/upload/1000120792_smflvz" 
            alt="Payment QR Code" 
            className="w-48 h-48 rounded-xl border border-slate-200 shadow-sm object-contain"
          />
        </div>
        <p className="font-mono text-lg font-bold text-slate-900 bg-slate-100 py-2 px-4 rounded-xl inline-block mx-auto mb-2">Scan to Pay</p>
        <p className="text-sm text-slate-500 font-medium">Scan this QR code using any UPI app to pay.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-lg shadow-slate-200 border border-slate-200 p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Submit Payment Proof</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">UTR Number (Unique Transaction Reference)</label>
            <input required type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none bg-slate-50/50" placeholder="Enter 12-digit UTR number" />
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">Upload Screenshot (Optional)</label>
             <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-indigo-500 transition-colors bg-slate-50/50">
                <div className="space-y-1 text-center flex flex-col items-center">
                  <Upload className="mx-auto h-10 w-10 text-slate-400 mb-3" />
                  <div className="flex text-sm text-slate-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-bold text-indigo-600 hover:text-indigo-500 focus-within:outline-none px-3 py-1.5 shadow-sm border border-slate-200">
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} accept="image/*" />
                    </label>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3">{file ? file.name : "Optional: PNG, JPG, GIF up to 5MB"}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">Payment screenshot is optional. Your UTR number will be used for payment verification.</p>
          </div>

          <button type="submit" disabled={submitting} className={`w-full bg-slate-900 text-white rounded-xl py-4 font-bold text-sm tracking-wide flex justify-center items-center transition-colors hover:bg-slate-800 shadow-lg shadow-slate-200 ${submitting ? 'opacity-70' : ''}`}>
             {submitting ? 'Submitting...' : 'Confirm Payment'}
          </button>
        </form>
      </div>
    </div>
  );
}
