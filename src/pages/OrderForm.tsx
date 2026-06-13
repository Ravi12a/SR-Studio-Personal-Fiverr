import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { Gig } from '../types';
import { useAuth } from '../lib/auth';
import toast from 'react-hot-toast';

export default function OrderForm() {
  const { id } = useParams<{ id: string }>(); // gigId
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    phone: '',
    projectTitle: '',
    description: '',
    additionalRequirements: ''
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!id) return;
    try {
      const docRef = doc(db, 'gigs', id);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setGig({ id: docSnap.id, ...docSnap.data() } as Gig);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `gigs/${id}`);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
       handleFirestoreError(error, OperationType.GET, `gigs/${id}`);
       setLoading(false);
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gig || !user) return;
    setSubmitting(true);
    
    try {
      let fileUrl = '';
      if (file) {
        try {
          const storageRef = ref(storage, `requirements/${user.uid}/${Date.now()}_${file.name}`);
          const uploadPromise = uploadBytes(storageRef, file);
          const timeoutPromise = new Promise((_, reject) => {
             setTimeout(() => reject(new Error("Upload timed out after 8 seconds.")), 8000);
          });
          const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
          fileUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadError) {
          console.error("Storage upload error:", uploadError);
          toast.error("Failed to upload file, but proceeding to order creation.");
        }
      }

      const orderData = {
        clientId: user.uid,
        gigId: gig.id,
        clientName: formData.name,
        clientEmail: formData.email,
        clientPhone: formData.phone,
        projectTitle: formData.projectTitle,
        projectDescription: formData.description,
        additionalRequirements: formData.additionalRequirements,
        fileUrl,
        status: 'Pending Payment Verification',
        amount: gig.price,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const newOrderRef = doc(collection(db, 'orders'));
      
      setDoc(newOrderRef, orderData).catch(err => console.error("Order sync error", err));
      toast.success("Order submitted! Redirecting to payment...");
      navigate(`/payment/${newOrderRef.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center">Loading...</div>;
  if (!gig) return <div className="min-h-screen flex justify-center items-center">Service not found.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-3xl shadow-lg shadow-slate-200 border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-8 py-6 text-white border-b border-slate-800">
          <h1 className="text-2xl font-bold tracking-tight">Checkout: {gig.title}</h1>
          <p className="mt-1 text-slate-400 text-sm font-semibold tracking-wider uppercase">Total Amount: ₹{gig.price}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none bg-slate-50/50" placeholder="John Doe" />
            </div>
             <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none bg-slate-50/50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">WhatsApp Number</label>
            <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none bg-slate-50/50" placeholder="+1 234 567 8900" />
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">Project Title</label>
             <input required type="text" value={formData.projectTitle} onChange={e => setFormData({...formData, projectTitle: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none bg-slate-50/50" placeholder="e.g. Modern SaaS Website Redesign" />
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">Project Description</label>
             <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none bg-slate-50/50" placeholder="Describe your project in detail..." />
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">Any Attachments? (Optional)</label>
             <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 bg-slate-50/50" />
          </div>

          <div className="pt-6 border-t border-slate-100">
             <button type="submit" disabled={submitting} className={`w-full bg-slate-900 text-white rounded-xl py-4 font-bold text-sm tracking-wide flex items-center justify-center transition-all hover:bg-slate-800 shadow-lg shadow-slate-200 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
               {submitting ? 'Processing...' : 'Place Order & Pay Manually'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
