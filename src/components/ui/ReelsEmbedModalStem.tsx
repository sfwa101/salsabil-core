'use client';

import React from 'react';
import type { DummyReel } from '@/services/dummy-ui-service';
import { X, ShoppingBag } from 'lucide-react';

export interface ReelsEmbedModalStemProps {
  isOpen: boolean;
  onClose: () => void;
  reel: DummyReel | null;
}

export const ReelsEmbedModalStem: React.FC<ReelsEmbedModalStemProps> = ({ isOpen, onClose, reel }) => {
  if (!isOpen || !reel) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4" dir="rtl">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Close Button (Top Right) */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md flex items-center justify-center z-[90] transition-colors"
      >
        <X size={24} />
      </button>

      {/* Reel Container */}
      <div className="relative w-full max-w-sm aspect-[9/16] h-[85vh] sm:h-[80vh] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
        
        {/* Iframe Embed */}
        <iframe 
          src={reel.embedUrl}
          title={reel.title}
          className="w-full h-full object-cover border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />

        {/* Overlay Footer for Title and Actions */}
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none flex flex-col justify-end">
          <div className="pointer-events-auto flex flex-col gap-3">
            <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md">
              {reel.title}
            </h3>
            
            <button className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 backdrop-blur-md transition-colors shadow-lg">
              <ShoppingBag size={18} />
              <span>تصفح مكونات الوصفة</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
