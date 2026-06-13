import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc, addDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Order, Gig } from '../types';
import { useAuth } from '../lib/auth';
import toast from 'react-hot-toast';
import { PlusCircle, Search, Upload } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'gigs' | 'orders' | 'payments' | 'portfolio' | 'testimonials' | 'shares' | 'settings'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Gig state
  const [creatingGig, setCreatingGig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newGig, setNewGig] = useState({ title: '', description: '', price: 0, deliveryTime: 1 });
  const [editingGigId, setEditingGigId] = useState<string | null>(null);
  const [editGigData, setEditGigData] = useState({ title: '', description: '', price: 0, deliveryTime: 1 });
  
  // Delivery State
  const [uploadingDeliveryId, setUploadingDeliveryId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  
  // Expanded Order State
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderPaymentMap, setOrderPaymentMap] = useState<Record<string, any>>({});
  
  const handleToggleExpandOrder = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    
    if (!orderPaymentMap[orderId]) {
      try {
        const paymentQ = query(collection(db, 'payments'));
        const paymentsSnap = await getDocs(paymentQ);
        let foundPayment = null;
        paymentsSnap.forEach(doc => {
          if (doc.data().orderId === orderId) foundPayment = doc.data();
        });
        if (foundPayment) {
          setOrderPaymentMap(prev => ({...prev, [orderId]: foundPayment}));
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    let unsubscribeOrders: () => void;
    let unsubscribeGigs: () => void;
    let unsubscribeShares: () => void;
    
    try {
      const ordersQ = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      unsubscribeOrders = onSnapshot(ordersQ, (ordersSnap) => {
        const fetchedOrders: Order[] = [];
        ordersSnap.forEach((doc) => fetchedOrders.push({ id: doc.id, ...doc.data() } as Order));
        setOrders(fetchedOrders);
        // Only stop loading once both are basically set or at least one is fetched
        setLoading(false);
      }, (error) => {
        console.error(error);
        setLoading(false);
      });

      const gigsQ = query(collection(db, 'gigs'), orderBy('createdAt', 'desc'));
      unsubscribeGigs = onSnapshot(gigsQ, (gigsSnap) => {
        const fetchedGigs: Gig[] = [];
        gigsSnap.forEach((doc) => fetchedGigs.push({ id: doc.id, ...doc.data() } as Gig));
        setGigs(fetchedGigs);
      }, (error: any) => {
        console.error(error);
        if (error.code === 'permission-denied' || error.message?.includes('API key')) {
           toast.error(
             `Database Access Denied! Please add both https://${window.location.hostname}/* and https://${firebaseConfig.authDomain}/* to your Google Cloud API Key HTTP referrers.`,
             { duration: 10000 }
           );
        }
      });

      const sharesQ = query(collection(db, 'gigShares'), orderBy('createdAt', 'desc'));
      unsubscribeShares = onSnapshot(sharesQ, (sharesSnap) => {
        const fetchedShares: any[] = [];
        sharesSnap.forEach((doc) => fetchedShares.push({ id: doc.id, ...doc.data() }));
        setShares(fetchedShares);
      }, (error) => {
        console.error(error);
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.LIST, `dashboard`);
       setLoading(false);
    }
    
    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeGigs) unsubscribeGigs();
      if (unsubscribeShares) unsubscribeShares();
    };
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      updateDoc(doc(db, 'orders', orderId), { 
        status: newStatus,
        updatedAt: serverTimestamp()
      }).catch(err => console.error("Update sync failed:", err));
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as any, updatedAt: new Date() } : o));
      toast.success("Order status updated (syncing...)");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const handleUploadDelivery = async (orderId: string) => {
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      toast.loading("Uploading delivery...", { id: 'delivery' });
      const storageRef = ref(storage, `deliveries/${orderId}/${file.name}`);
      const uploadPromise = uploadBytes(storageRef, file);
      const timeoutPromise = new Promise((_, reject) => {
         setTimeout(() => reject(new Error("Delivery upload timed out.")), 15000);
      });
      const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
      const fileUrl = await getDownloadURL(snapshot.ref);

      await addDoc(collection(db, 'deliveries'), {
         orderId,
         fileUrls: [fileUrl],
         createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'orders', orderId), {
         status: 'Delivered',
         updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'notifications'), {
         clientId: order.clientId,
         title: 'Your order has been delivered!',
         message: `The final delivery for your project "${order.projectTitle}" is ready.`,
         read: false,
         createdAt: serverTimestamp()
      });

      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'Delivered' as any, updatedAt: new Date() } : o));
      setUploadingDeliveryId(null);
      setFile(null);
      toast.success("Delivery uploaded successfully!", { id: 'delivery' });
    } catch (error) {
       console.error(error);
       toast.error("Failed to upload delivery", { id: 'delivery' });
    }
  };

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const gigData = {
        title: newGig.title,
        description: newGig.description,
        price: Number(newGig.price),
        deliveryTime: Number(newGig.deliveryTime),
        images: [],
        features: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const newGigRef = doc(collection(db, 'gigs'));
      
      // Update UI immediately
      setGigs([{ id: newGigRef.id, ...gigData } as Gig, ...gigs]);
      setCreatingGig(false);
      setNewGig({ title: '', description: '', price: 0, deliveryTime: 1 });
      toast.success("Gig created (syncing...)");

      // Sync in background (will retry automatically if offline)
      setDoc(newGigRef, gigData).catch(error => {
        console.error("Failed to sync gig to server:", error);
      });
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to create gig: ${error.message || error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditGig = (gig: Gig) => {
    setEditingGigId(gig.id);
    setEditGigData({
      title: gig.title,
      description: gig.description,
      price: gig.price,
      deliveryTime: gig.deliveryTime
    });
    setCreatingGig(false);
  };

  const handleUpdateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGigId) return;
    setIsSaving(true);
    try {
      const updatedData = {
        title: editGigData.title,
        description: editGigData.description,
        price: Number(editGigData.price),
        deliveryTime: Number(editGigData.deliveryTime),
        updatedAt: serverTimestamp()
      };
      
      setGigs(gigs.map(g => g.id === editingGigId ? { ...g, ...updatedData } as Gig : g));
      setEditingGigId(null);
      toast.success("Gig updated (syncing...)");

      const gigRef = doc(db, 'gigs', editingGigId);
      updateDoc(gigRef, updatedData).catch(error => {
        console.error("Failed to sync updated gig:", error);
      });
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to update gig: ${error.message || error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGig = async (gigId: string) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      setGigs(gigs.filter(g => g.id !== gigId));
      toast.success("Gig deleted (syncing...)");

      const gigRef = doc(db, 'gigs', gigId);
      deleteDoc(gigRef).catch(error => {
        console.error("Failed to delete gig:", error);
      });
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to delete gig: ${error.message || error}`);
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center">Loading admin dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12">
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-8">Admin Dashboard</h1>

      <div className="mb-8 border-b border-slate-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8 min-w-max">
          {(['dashboard', 'gigs', 'orders', 'payments', 'portfolio', 'testimonials', 'shares', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm tracking-wide transition-colors capitalize`}
            >
              {tab === 'gigs' ? 'Gig Management' : tab === 'shares' ? 'Share Analytics' : tab}
            </button>
          ))}
        </nav>
      </div>
      
      {activeTab === 'dashboard' && (
        <div className="p-12 text-center text-slate-500 bg-white rounded-3xl shadow-sm border border-slate-200">
           Dashboard Overview (Analytics coming soon)
        </div>
      )}
      
      {activeTab === 'payments' && (
        <div className="p-12 text-center text-slate-500 bg-white rounded-3xl shadow-sm border border-slate-200">
           Payments Management (Coming soon)
        </div>
      )}
      
      {activeTab === 'portfolio' && (
        <div className="p-12 text-center text-slate-500 bg-white rounded-3xl shadow-sm border border-slate-200">
           Portfolio Management (Coming soon)
        </div>
      )}
      
      {activeTab === 'testimonials' && (
        <div className="p-12 text-center text-slate-500 bg-white rounded-3xl shadow-sm border border-slate-200">
           Testimonials Management (Coming soon)
        </div>
      )}

      {activeTab === 'shares' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Shares</h3>
              <p className="text-4xl font-extrabold text-slate-900">{shares.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Top Platform</h3>
              <p className="text-2xl font-bold text-slate-900 truncate">
                {shares.length > 0 ? (
                  Object.entries(shares.reduce((acc, curr) => ({...acc, [curr.platform]: (acc[curr.platform] || 0) + 1}), {} as Record<string, number>))
                    .sort((a: any, b: any) => b[1] - a[1])[0][0]
                ) : 'N/A'}
              </p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Most Shared Gig</h3>
              <p className="text-xl font-bold text-slate-900 truncate" title={shares.length > 0 ? Object.entries(shares.reduce((acc, curr) => ({...acc, [curr.gigTitle]: (acc[curr.gigTitle] || 0) + 1}), {} as Record<string, number>)).sort((a: any, b: any) => b[1] - a[1])[0][0] : 'N/A'}>
                {shares.length > 0 ? (
                  Object.entries(shares.reduce((acc, curr) => ({...acc, [curr.gigTitle]: (acc[curr.gigTitle] || 0) + 1}), {} as Record<string, number>))
                    .sort((a: any, b: any) => b[1] - a[1])[0][0]
                ) : 'N/A'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100">
               <h2 className="text-xl font-bold text-slate-900">Recent Share Activity</h2>
             </div>
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-slate-100">
                 <thead className="bg-slate-50">
                   <tr>
                     <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gig Title</th>
                     <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Platform</th>
                     <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-slate-100">
                   {shares.map((share) => (
                     <tr key={share.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4">
                         <div className="text-sm font-bold text-slate-900 line-clamp-1">{share.gigTitle}</div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className="inline-flex px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md bg-indigo-50 text-indigo-700">
                           {share.platform}
                         </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                         {share.createdAt ? format(share.createdAt.toDate(), 'MMM d, yyyy h:mm a') : 'Just now'}
                       </td>
                     </tr>
                   ))}
                   {shares.length === 0 && (
                     <tr>
                       <td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-medium">No shares recorded yet.</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}
      
      {activeTab === 'settings' && (
        <div className="p-12 text-center text-slate-500 bg-white rounded-3xl shadow-sm border border-slate-200">
           Website Settings (Coming soon)
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-slate-200">
               <thead className="bg-slate-50">
                 <tr>
                   <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Project / Client</th>
                   <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                   <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                   <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                   <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-slate-100">
                 {orders.map((order) => (
                   <React.Fragment key={order.id}>
                     <tr className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleToggleExpandOrder(order.id)}>
                            {order.projectTitle} {expandedOrderId === order.id ? '▲' : '▼'}
                         </div>
                         <div className="text-xs font-medium text-slate-500">{order.clientName} ({order.clientEmail})</div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                         {order.createdAt ? format(order.createdAt.toDate(), 'MMM d, yyyy') : ''}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">
                         ₹{order.amount}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm">
                         <span className="inline-flex px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md bg-indigo-50 text-indigo-700">
                            {order.status}
                         </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          <select 
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-sm font-medium border border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-lg bg-white"
                          >
                            <option value="Pending Payment Verification">Pending Payment</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Revision Requested">Revision Requested</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                          <div className="mt-2 text-right">
                             <button onClick={() => handleToggleExpandOrder(order.id)} className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 hover:text-indigo-800">
                                {expandedOrderId === order.id ? 'Hide Details' : 'View Details'}
                             </button>
                          </div>
                       </td>
                     </tr>
                     {expandedOrderId === order.id && (
                       <tr className="bg-slate-50 border-b border-slate-100">
                         <td colSpan={5} className="px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div>
                                  <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-4 pb-2 border-b border-slate-200">Order Details</h4>
                                  <div className="space-y-4 text-sm">
                                     <div>
                                        <span className="font-bold text-slate-900 block mb-1">Project Description:</span>
                                        <p className="text-slate-600 whitespace-pre-wrap">{order.projectDescription}</p>
                                     </div>
                                     {order.additionalRequirements && (
                                       <div>
                                          <span className="font-bold text-slate-900 block mb-1">Additional Requirements:</span>
                                          <p className="text-slate-600 whitespace-pre-wrap">{order.additionalRequirements}</p>
                                       </div>
                                     )}
                                     {order.fileUrl && (
                                       <div>
                                          <span className="font-bold text-slate-900 block mb-1">Attachments:</span>
                                          <a href={order.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium inline-flex items-center">
                                             View Attached Document ↗
                                          </a>
                                       </div>
                                     )}
                                  </div>
                               </div>
                               <div>
                                  <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-4 pb-2 border-b border-slate-200">Payment & Actions</h4>
                                  <div className="space-y-4">
                                     {orderPaymentMap[order.id] ? (
                                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                                           <div className="text-sm font-bold text-slate-900 mb-1">Payment Attached</div>
                                           <div className="text-sm text-slate-600 mb-2">Transaction ID/UTR: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">{orderPaymentMap[order.id].transactionId}</span></div>
                                           <div className="text-sm text-slate-600 mb-3">Status: <span className="font-bold uppercase text-[10px] tracking-wider">{orderPaymentMap[order.id].status}</span></div>
                                           {orderPaymentMap[order.id].screenshotUrl && (
                                              <a href={orderPaymentMap[order.id].screenshotUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-bold inline-flex items-center transition-colors">
                                                 <Search className="w-4 h-4 mr-1" />
                                                 View Payment Screenshot
                                              </a>
                                           )}
                                        </div>
                                     ) : (
                                        <div className="text-sm text-slate-500 italic">No payment details submitted yet.</div>
                                     )}
                                     
                                     <div className="mt-6 pt-6 border-t border-slate-200">
                                        <h5 className="text-sm font-bold text-slate-900 mb-2">Delivery Management</h5>
                                        {(order.status === 'In Progress' || order.status === 'Revision Requested') ? (
                                           <div className="bg-white p-4 rounded-xl border border-indigo-100">
                                              {uploadingDeliveryId === order.id ? (
                                                <div className="flex flex-col space-y-3">
                                                   <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                                   <div className="flex space-x-2">
                                                      <button onClick={() => handleUploadDelivery(order.id)} className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-slate-800 transition-colors">Confirm Upload</button>
                                                      <button onClick={() => {setUploadingDeliveryId(null); setFile(null)}} className="bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200">Cancel</button>
                                                   </div>
                                                </div>
                                              ) : (
                                                 <button onClick={() => setUploadingDeliveryId(order.id)} className="inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                                                    <Upload className="w-4 h-4 mr-1" />
                                                    Deliver Work
                                                 </button>
                                              )}
                                           </div>
                                        ) : (
                                           <div className="text-sm text-slate-500 italic">Delivery is not available in the current status.</div>
                                        )}
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </td>
                       </tr>
                     )}
                   </React.Fragment>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === 'gigs' && (
        <div>
           <div className="mb-6 flex justify-end border-b border-slate-100 pb-4">
              <button 
                onClick={() => { setCreatingGig(!creatingGig); setEditingGigId(null); }} 
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Service
              </button>
           </div>
           
           {creatingGig && (
             <div className="bg-white p-8 rounded-3xl mb-8 border border-slate-200 shadow-sm">
               <h3 className="text-xl font-bold mb-6 text-slate-900 border-b border-slate-100 pb-2">New Service Details</h3>
               <form onSubmit={handleCreateGig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Title</label>
                   <input required type="text" value={newGig.title} onChange={e=>setNewGig({...newGig, title: e.target.value})} className="mt-1 block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50/50" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Price (₹)</label>
                   <input required type="number" min="0" value={newGig.price} onChange={e=>setNewGig({...newGig, price: Number(e.target.value)})} className="mt-1 block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50/50" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Delivery Time (Days)</label>
                   <input required type="number" min="1" value={newGig.deliveryTime} onChange={e=>setNewGig({...newGig, deliveryTime: Number(e.target.value)})} className="mt-1 block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50/50" />
                 </div>
                 <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                   <textarea required rows={3} value={newGig.description} onChange={e=>setNewGig({...newGig, description: e.target.value})} className="mt-1 block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50/50" />
                 </div>
                 <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setCreatingGig(false)} className="px-6 py-3 font-bold text-sm text-slate-700 hover:bg-slate-100 rounded-xl transition-colors" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="px-6 py-3 font-bold text-sm text-white bg-slate-900 rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-200 transition-colors" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Service'}
                    </button>
                 </div>
               </form>
             </div>
           )}

           {editingGigId && (
             <div className="bg-white p-8 rounded-3xl mb-8 border border-slate-200 shadow-sm border-indigo-200">
               <h3 className="text-xl font-bold mb-6 text-slate-900 border-b border-slate-100 pb-2">Edit Service Details</h3>
               <form onSubmit={handleUpdateGig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Title</label>
                   <input required type="text" value={editGigData.title} onChange={e=>setEditGigData({...editGigData, title: e.target.value})} className="mt-1 block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50/50" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Price (₹)</label>
                   <input required type="number" min="0" value={editGigData.price} onChange={e=>setEditGigData({...editGigData, price: Number(e.target.value)})} className="mt-1 block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50/50" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Delivery Time (Days)</label>
                   <input required type="number" min="1" value={editGigData.deliveryTime} onChange={e=>setEditGigData({...editGigData, deliveryTime: Number(e.target.value)})} className="mt-1 block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50/50" />
                 </div>
                 <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                   <textarea required rows={3} value={editGigData.description} onChange={e=>setEditGigData({...editGigData, description: e.target.value})} className="mt-1 block w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50/50" />
                 </div>
                 <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setEditingGigId(null)} className="px-6 py-3 font-bold text-sm text-slate-700 hover:bg-slate-100 rounded-xl transition-colors" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="px-6 py-3 font-bold text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors" disabled={isSaving}>
                      {isSaving ? 'Updating...' : 'Update Service'}
                    </button>
                 </div>
               </form>
             </div>
           )}

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {gigs.map(gig => (
               <div key={gig.id} className="bg-white border text-slate-900 border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                 <div>
                   <h4 className="font-bold text-lg mb-2">{gig.title}</h4>
                   <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-4 border-b border-slate-100 pb-2">
                      <span className="text-indigo-600">₹{gig.price}</span>
                      <span>{gig.deliveryTime} Days</span>
                   </div>
                   <p className="text-sm text-slate-600 line-clamp-3 mb-6 italic">{gig.description}</p>
                 </div>
                 <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-auto">
                   <button onClick={() => handleDeleteGig(gig.id)} className="text-[10px] uppercase font-bold tracking-wider text-red-600 hover:text-red-800 transition-colors cursor-pointer bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg">Delete</button>
                   <button onClick={() => handleStartEditGig(gig)} className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg">Edit Service</button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
}
