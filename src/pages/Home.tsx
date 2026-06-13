import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Star, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="px-6 md:px-10 py-16 md:py-24 flex flex-col md:flex-row gap-10 items-center justify-between bg-white border-b border-slate-100">
        <div className="w-full md:w-3/5 space-y-6">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            Direct from Founder
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight"
          >
            Premium Digital Solutions for <span className="text-indigo-600">Modern Businesses</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-600 leading-relaxed max-w-xl"
          >
            Bypass the agencies. Work directly with a senior designer to transform your product from concept to high-fidelity reality in record time.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-4"
          >
            <Link to="/gigs" className="px-8 py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 transition-transform hover:scale-105">
              Browse Services
            </Link>
            <Link to="/gigs" className="px-8 py-3.5 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold hover:bg-slate-50 transition-colors">
              View Portfolio
            </Link>
          </motion.div>
        </div>
        
        <div className="w-full md:w-2/5 hidden md:block">
          <div className="relative bg-slate-100 rounded-3xl h-64 overflow-hidden border border-slate-200">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center">✨</div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Avg. Delivery</div>
                  <div className="text-lg font-bold text-slate-800">48 Hours</div>
                </div>
              </div>
              <div className="space-y-3 mt-4">
                <div className="h-2 bg-white rounded-full w-full opacity-60"></div>
                <div className="h-2 bg-white rounded-full w-3/4 opacity-60"></div>
                <div className="h-2 bg-white rounded-full w-1/2 opacity-60"></div>
              </div>
              <div className="mt-8 flex -space-x-2">
                <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-300"></div>
                <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-400"></div>
                <div className="w-10 h-10 rounded-full border-2 border-white bg-indigo-200 flex items-center justify-center text-[10px] font-bold text-indigo-800 tracking-tighter">+42</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose SR Studio */}
      <section className="px-6 md:px-10 py-16 md:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-800">Why Choose SR Studio?</h2>
            <p className="mt-4 text-lg text-slate-600">Experience the difference of working directly with a dedicated professional.</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
               { title: "Fast Delivery", icon: Zap, desc: "Quick turnarounds without sacrificing quality. We respect your deadlines." },
               { title: "Premium Quality", icon: Star, desc: "Meticulous attention to detail resulting in polished, beautiful results." },
               { title: "Unlimited Support", icon: CheckCircle2, desc: "We are here for you even after the project is completed." },
               { title: "Affordable Pricing", icon: CheckCircle2, desc: "Premium quality digital solutions that fit your business budget." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center"
              >
                <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Stats Footer */}
      <footer className="py-10 bg-slate-900 text-white px-6 md:px-10 flex flex-col md:flex-row items-center justify-between shrink-0 gap-10">
        <div className="flex gap-12 text-left w-full md:w-auto overflow-x-auto pb-4 md:pb-0">
          <div className="flex flex-col">
            <span className="text-indigo-400 text-xl font-bold">500+</span>
            <span className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider">Projects Delivered</span>
          </div>
          <div className="flex flex-col">
            <span className="text-indigo-400 text-xl font-bold">98%</span>
            <span className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider">Success Rate</span>
          </div>
          <div className="flex flex-col">
            <span className="text-indigo-400 text-xl font-bold">4.9/5</span>
            <span className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider">Client Rating</span>
          </div>
        </div>
        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">Ready to start?</p>
            <p className="text-sm font-bold">hello@srstudio.com</p>
          </div>
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-indigo-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          </div>
        </div>
      </footer>
    </div>
  );
}
