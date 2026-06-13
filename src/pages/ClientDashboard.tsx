import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, Delivery, Gig } from '../types';
import { useAuth } from '../lib/auth';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle2, AlertCircle, Download, Star, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import ShareGigModal from '../components/ShareGigModal';

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeDelivery, setActiveDelivery] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [shareGig, setShareGig] = useState<Gig | null>(null);

  useEffect(() => {
    // Fetch Gigs for the dashboard display!
    let unsubscribeGigs: () => void = () => {};
    try {
      const gigsQuery = query(collection(db, 'gigs'), orderBy('createdAt', 'desc'));
      unsubscribeGigs = onSnapshot(gigsQuery, (querySnapshot) => {
         const fetchedGigs: Gig[] = [];
         querySnapshot.forEach((doc) => {
           fetchedGigs.push({ id: doc.id, ...doc.data() } as Gig);
         });
         setGigs(fetchedGigs);
      }, (error) => {
         console.error("Error fetching gigs in dashboard:", error);
      });
    } catch(err) {
       console.error(err);
    }

    if (!user) {
      setLoading(false);
      return unsubscribeGigs;
    }
    
    // Fetch user orders
    let unsubscribeOrders: () => void = () => {};
    try {
      const q = query(
        collection(db, 'orders'),
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      unsubscribeOrders = onSnapshot(q, (querySnapshot) => {
        const fetchedOrders: Order[] = [];
        querySnapshot.forEach((doc) => {
          fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
        });
        setOrders(fetchedOrders);
        setLoading(false);
      }, (error) => {
        console.error(error);
        setLoading(false);
      });
      
      return () => {
         unsubscribeOrders();
         unsubscribeGigs();
      };
    } catch (error) {
       handleFirestoreError(error, OperationType.LIST, `orders`);
       setLoading(false);
       return unsubscribeGigs;
    }
  }, [user]);

  const fetchDelivery = async (orderId: string) => {
    try {
       const q = query(collection(db, 'deliveries'), where('orderId', '==', orderId));
       const snapshot = await getDocs(q);
       const fetchedDeliveries: Delivery[] = [];
       snapshot.forEach(doc => fetchedDeliveries.push({ id: doc.id, ...doc.data() } as Delivery));
       setDeliveries(fetchedDeliveries);
       setActiveDelivery(orderId);
    } catch (err) {
       handleFirestoreError(err, OperationType.LIST, 'deliveries');
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Pending Payment Verification': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Revision Requested': return 'bg-orange-100 text-orange-800';
      case 'Delivered': return 'bg-purple-100 text-purple-800';
      case 'Completed': return 'bg-emerald-100 text-emerald-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
     switch (status) {
       case 'Pending Payment Verification': return <AlertCircle className="w-4 h-4 mr-1.5" />;
       case 'In Progress': return <Clock className="w-4 h-4 mr-1.5" />;
       case 'Completed': return <CheckCircle2 className="w-4 h-4 mr-1.5" />;
       case 'Delivered': return <Package className="w-4 h-4 mr-1.5" />;
       default: return <Clock className="w-4 h-4 mr-1.5" />;
     }
  }

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center">Loading dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12">
      <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Client Dashboard</h1>
          <p className="mt-2 text-slate-500 font-medium">Welcome back, track your orders and deliverables here.</p>
        </div>
        <Link to="/gigs" className="mt-4 md:mt-0 inline-flex items-center justify-center px-6 py-3 border border-transparent shadow-sm shadow-slate-200 text-sm font-bold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors">
          Browse More Services
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-lg font-bold leading-6 text-slate-900">Your Orders</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {orders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium">You haven't placed any orders yet.</div>
          ) : (
             <ul className="divide-y divide-slate-200">
               {orders.map((order) => (
                  <li key={order.id} className="p-8 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                       <div className="mb-4 sm:mb-0">
                         <div className="flex items-center mb-2">
                           <h4 className="text-lg font-bold text-slate-900 mr-4">{order.projectTitle}</h4>
                           <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] tracking-wider uppercase font-bold ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {order.status}
                           </span>
                         </div>
                         <div className="text-sm text-slate-500 flex items-center space-x-4 font-medium">
                           <span>Order #{order.id.slice(0, 8)}</span>
                           <span>•</span>
                           <span>{order.createdAt ? format(order.createdAt.toDate(), 'MMM d, yyyy') : ''}</span>
                           <span>•</span>
                           <span className="font-bold text-slate-900">₹{order.amount}</span>
                         </div>
                       </div>
                       <div className="flex space-x-3">
                          {order.status === 'Pending Payment Verification' && (
                             <Link to={`/payment/${order.id}`} className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-xs font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                               Upload Payment Proof
                             </Link>
                          )}
                          {(order.status === 'Delivered' || order.status === 'Completed') && (
                             <button onClick={() => fetchDelivery(order.id)} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm shadow-slate-200 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                               <Download className="w-4 h-4 mr-2" />
                               View Delivery
                             </button>
                          )}
                       </div>
                    </div>
                  </li>
               ))}
             </ul>
          )}
        </div>
      </div>

      <div className="mt-16 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Available Studio Services</h2>
          <p className="mt-2 text-slate-600">Select a premium service to get started securely.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {gigs.map((gig, index) => (
          <div 
            key={gig.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-md transition-shadow flex flex-col"
          >
            <div className="h-32 bg-slate-200 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-tr from-slate-800 to-slate-400 opacity-20 z-10 group-hover:opacity-10 transition-opacity"></div>
               <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-bold z-20">5.0 ★</div>
               <button onClick={(e) => { e.preventDefault(); setShareGig(gig); }} className="absolute top-3 left-3 p-1.5 bg-white/90 backdrop-blur rounded-full text-slate-700 hover:text-indigo-600 z-20 transition-colors shadow-sm">
                 <Share2 className="w-4 h-4" />
               </button>
               {gig.images && gig.images[0] ? (
                 <img src={gig.images[0]} alt={gig.title} className="object-cover w-full h-full hover:scale-105 transition-transform duration-500 relative z-0" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-400 relative z-0">No Image</div>
               )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h2 className="font-bold text-slate-900 mb-1 leading-tight group-hover:text-indigo-600 line-clamp-2">{gig.title}</h2>
              <p className="text-xs text-slate-500 line-clamp-2 mb-4 italic flex-grow">{gig.description}</p>
              
              <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400">Starting at</span>
                <span className="text-lg font-bold text-slate-900">₹{gig.price}</span>
              </div>
              <Link 
                to={`/gig/${gig.id}`}
                className="mt-4 w-full bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white px-4 py-2 rounded-xl text-center font-bold text-sm transition-colors"
               >
                 View Details
               </Link>
            </div>
          </div>
        ))}
        {gigs.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-500 text-lg bg-white rounded-2xl border border-gray-100 border-dashed">
            No services currently available. Please check back later.
          </div>
        )}
      </div>

      {activeDelivery && (
         <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
           <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
             <div className="fixed inset-0 bg-slate-900 bg-opacity-75 transition-opacity backdrop-blur-sm" onClick={() => setActiveDelivery(null)}></div>
             <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
             <div className="inline-block align-bottom bg-white rounded-3xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-slate-100">
                <div>
                   <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4 border border-emerald-200">
                     <Package className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                   </div>
                   <div className="mt-3 text-center sm:mt-5">
                     <h3 className="text-xl leading-6 font-bold text-slate-900" id="modal-title">Project Delivered</h3>
                     <div className="mt-2">
                       <p className="text-sm text-slate-500 font-medium pb-4 border-b border-slate-100">
                         Your project files are ready for download.
                       </p>
                       <div className="mt-4 space-y-3">
                         {deliveries.length === 0 && <p className="text-sm text-slate-400">No files found.</p>}
                         {deliveries.map((delivery, i) => (
                           <div key={i} className="flex flex-col space-y-2">
                              {delivery.fileUrls.map((url, j) => (
                                 <a key={j} href={url} target="_blank" rel="noreferrer" className="inline-flex w-full justify-center items-center px-4 py-3 border border-slate-200 shadow-sm text-sm font-bold rounded-xl text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors">
                                   <Download className="w-4 h-4 mr-2 text-slate-500" />
                                   Download File {j + 1}
                                 </a>
                              ))}
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>
                </div>
                <div className="mt-6 sm:mt-8">
                  <button type="button" className="inline-flex justify-center w-full rounded-xl border border-transparent shadow-[0_4px_12px_rgba(0,0,0,0.1)] px-4 py-3 bg-slate-900 text-sm font-bold text-white hover:bg-slate-800 transition-colors focus:outline-none sm:text-sm" onClick={() => setActiveDelivery(null)}>
                    Close
                  </button>
                </div>
             </div>
           </div>
         </div>
      )}

      {shareGig && (
        <ShareGigModal gig={shareGig} onClose={() => setShareGig(null)} />
      )}
    </div>
  );
}
