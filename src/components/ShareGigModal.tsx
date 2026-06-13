import React, { useState } from 'react';
import { X, Copy, Share2, Facebook, Twitter, Linkedin, Send, MessageCircle } from 'lucide-react';
import { Gig } from '../types';
import toast from 'react-hot-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ShareGigModalProps {
  gig: Gig;
  onClose: () => void;
}

export default function ShareGigModal({ gig, onClose }: ShareGigModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const gigUrl = `${window.location.origin}/gig/${gig.id}`;
  const shareText = `Check out this service on SR Studio:\n\n${gig.title}\n\n`;

  const trackShare = async (platform: string) => {
    try {
      await addDoc(collection(db, 'gigShares'), {
        gigId: gig.id,
        gigTitle: gig.title,
        platform,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error tracking share:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(gigUrl);
      trackShare('Copy Link');
      toast.success("Link copied successfully.");
    } catch (err) {
      toast.error("Failed to copy link.");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: gig.title,
          text: shareText,
          url: gigUrl,
        });
        trackShare('Native Share');
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      toast.error("Native share not supported on this device.");
    }
  };

  const handleSocialShare = (platform: string) => {
    let url = '';
    const encodedUrl = encodeURIComponent(gigUrl);
    const encodedText = encodeURIComponent(shareText);

    switch (platform) {
      case 'WhatsApp':
        url = `https://api.whatsapp.com/send?text=${encodedText}${encodedUrl}`;
        break;
      case 'Telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'Facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'Twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'LinkedIn':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      trackShare(platform);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Share Service</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-slate-900 truncate">{gigUrl}</p>
              </div>
              <button onClick={handleCopyLink} className="shrink-0 flex items-center justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-2 rounded-xl transition-colors font-bold text-xs uppercase tracking-wider">
                <Copy className="w-4 h-4 mr-1.5" />
                Copy
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-6">
              <ShareButton icon={<MessageCircle className="w-6 h-6" />} label="WhatsApp" onClick={() => handleSocialShare('WhatsApp')} color="bg-green-100 text-green-700 hover:bg-green-200" />
              <ShareButton icon={<Send className="w-6 h-6" />} label="Telegram" onClick={() => handleSocialShare('Telegram')} color="bg-blue-100 text-blue-700 hover:bg-blue-200" />
              <ShareButton icon={<Facebook className="w-6 h-6" />} label="Facebook" onClick={() => handleSocialShare('Facebook')} color="bg-indigo-100 text-indigo-700 hover:bg-indigo-200" />
              <ShareButton icon={<Twitter className="w-6 h-6" />} label="X" onClick={() => handleSocialShare('Twitter')} color="bg-slate-100 text-slate-900 hover:bg-slate-200" />
              <ShareButton icon={<Linkedin className="w-6 h-6" />} label="LinkedIn" onClick={() => handleSocialShare('LinkedIn')} color="bg-sky-100 text-sky-700 hover:bg-sky-200" />
              
              {navigator.share && (
                <ShareButton icon={<Share2 className="w-6 h-6" />} label="More" onClick={handleNativeShare} color="bg-slate-100 text-slate-700 hover:bg-slate-200" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareButton({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center space-y-2 group">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${color}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-900 transition-colors">{label}</span>
    </button>
  );
}
