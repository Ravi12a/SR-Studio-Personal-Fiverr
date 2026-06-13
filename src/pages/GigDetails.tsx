import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Gig } from '../types';
import { Clock, CheckCircle2, Share2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Helmet } from 'react-helmet-async';
import ShareGigModal from '../components/ShareGigModal';

export default function GigDetails() {
  const { id } = useParams<{ id: string }>();
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    try {
      const docRef = doc(db, 'gigs', id);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setGig({ id: docSnap.id, ...docSnap.data() } as Gig);
        } else {
          setGig(null);
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

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center">Loading details...</div>;
  if (!gig) return <div className="min-h-[50vh] flex items-center justify-center text-red-500">Service not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12">
      <Helmet>
        <title>{gig.title} | SR Studio</title>
        <meta name="description" content={gig.description.substring(0, 160)} />
        <meta property="og:title" content={gig.title} />
        <meta property="og:description" content={gig.description.substring(0, 160)} />
        {gig.images && gig.images[0] && <meta property="og:image" content={gig.images[0]} />}
        <meta property="og:url" content={`${window.location.origin}/gig/${gig.id}`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={gig.title} />
        <meta name="twitter:description" content={gig.description.substring(0, 160)} />
        {gig.images && gig.images[0] && <meta name="twitter:image" content={gig.images[0]} />}
      </Helmet>

      <div className="lg:grid lg:grid-cols-12 lg:gap-10 items-start">
        {/* Left Column - Details */}
        <div className="lg:col-span-8">
          <div className="flex justify-between items-start mb-8">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-[1.1] pr-4">{gig.title}</h1>
            <button onClick={() => setShowShare(true)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold text-sm transition-colors tabular-nums uppercase tracking-wider shrink-0 shadow-sm border border-indigo-100">
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
          
          <div className="aspect-video bg-slate-100 rounded-3xl overflow-hidden mb-12 border border-slate-200 relative">
            {gig.images && gig.images[0] ? (
              <img src={gig.images[0]} alt={gig.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                 <div className="absolute inset-0 bg-gradient-to-tr from-slate-800 to-slate-400 opacity-20"></div>
                 <span className="relative z-10 text-xl tracking-wider font-bold">SR Studio Showcase</span>
              </div>
            )}
          </div>

          <div className="prose prose-indigo max-w-none mb-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">About This Service</h2>
            <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{gig.description}</p>
          </div>
        </div>

        {/* Right Column - Purchase Card */}
        <div className="lg:col-span-4 sticky top-24">
          <div className="bg-white rounded-3xl shadow-lg shadow-slate-200 border border-slate-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Premium Package</h3>
              <span className="text-3xl font-extrabold text-slate-900">₹{gig.price}</span>
            </div>
            
            <p className="text-slate-500 italic text-sm mb-6 pb-6 border-b border-slate-100 leading-relaxed">
              Full concept to high-fidelity reality. Direct communication with founders.
            </p>

            <div className="flex items-center text-slate-700 font-bold text-sm mb-6 bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <Clock className="w-5 h-5 mr-3 text-indigo-600" />
              <span>Avg. Setup <span className="text-slate-900">{gig.deliveryTime} {gig.deliveryTime === 1 ? 'Day' : 'Days'} Delivery</span></span>
            </div>

            <div className="mb-8">
              <h4 className="font-bold text-slate-400 mb-4 uppercase tracking-wider text-[10px]">What's Included</h4>
              <ul className="space-y-4">
                {gig.features && gig.features.map((feature, idx) => (
                   <li key={idx} className="flex items-start">
                     <CheckCircle2 className="w-5 h-5 text-indigo-600 mr-3 flex-shrink-0 mt-0.5" />
                     <span className="text-slate-700 text-sm font-medium">{feature}</span>
                   </li>
                ))}
                {(!gig.features || gig.features.length === 0) && (
                   <li className="text-slate-500 italic text-sm">No specific features listed.</li>
                )}
              </ul>
            </div>

            <button
               onClick={() => {
                 if (user) {
                   navigate(`/order/${gig.id}`);
                 } else {
                   alert("Please sign in first to place an order.");
                 }
               }}
               className="w-full bg-slate-900 text-white hover:bg-slate-800 px-6 py-4 rounded-xl text-sm font-bold flex justify-center items-center font-sans tracking-wide transition-colors shadow-lg shadow-slate-200"
            >
              Continue (₹{gig.price})
            </button>
            <p className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-4">You won't be charged yet</p>
          </div>
        </div>
      </div>
      
      {showShare && (
        <ShareGigModal gig={gig} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
