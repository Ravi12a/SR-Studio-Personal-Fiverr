import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Gig } from '../types';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Star, Share2 } from 'lucide-react';
import ShareGigModal from '../components/ShareGigModal';
import toast from 'react-hot-toast';

export default function Gigs() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareGig, setShareGig] = useState<Gig | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'gigs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gigsData: Gig[] = [];
      querySnapshot.forEach((doc) => {
        gigsData.push({ id: doc.id, ...doc.data() } as Gig);
      });
      setGigs(gigsData);
      setLoading(false);
    }, (error: any) => {
      console.error("Error fetching gigs in real-time", error);
      // Try to gracefully handle it since not everyone might have setup API keys correctly if they are a viewer
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center">Loading services...</div>;
  }

  return (
    <div className="px-6 md:px-10 py-10 lg:py-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Popular Studio Services</h1>
          <p className="mt-2 text-slate-600">Select a premium service to get started.</p>
        </div>
        <span className="text-indigo-600 font-semibold text-sm hover:underline mt-4 sm:mt-0 cursor-pointer">View all packages</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {gigs.map((gig, index) => (
          <motion.div 
            key={gig.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
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
          </motion.div>
        ))}
        {gigs.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-500 text-lg bg-white rounded-2xl border border-gray-100 border-dashed">
            No services currently available. Please check back later.
          </div>
        )}
      </div>
      {shareGig && (
        <ShareGigModal gig={shareGig} onClose={() => setShareGig(null)} />
      )}
    </div>
  );
}
