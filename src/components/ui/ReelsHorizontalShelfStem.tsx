'use client';

import React from 'react';
import { DummyReel } from '@/services/dummy-ui-service';
import { Play, Video, ChevronLeft } from 'lucide-react';

export interface ReelsHorizontalShelfStemProps {
  items: DummyReel[];
  onReelClick: (reel: DummyReel) => void;
}

export const ReelsHorizontalShelfStem: React.FC<ReelsHorizontalShelfStemProps> = ({ items, onReelClick }) => {
  if (!items || items.length === 0) return null;

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return <div className="flex gap-1 items-center"><Video size={12}/><span className="text-[10px] font-bold">YT</span></div>;
      case 'instagram': return <div className="flex gap-1 items-center"><Video size={12}/><span className="text-[10px] font-bold">IG</span></div>;
      case 'facebook': return <div className="flex gap-1 items-center"><Video size={12}/><span className="text-[10px] font-bold">FB</span></div>;
      default: return <Video size={14} />;
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 py-2" dir="rtl">
      
      {/* Header */}
      <div className="flex items-center justify-between px-2 sm:px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
            <Video size={16} fill="currentColor" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">ريلز ووصفات ريف المدينة</h2>
        </div>
        <button className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
          <span>عرض الكل</span>
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Reels Scroll Container */}
      <div className="w-full overflow-x-auto scrollbar-none snap-x snap-mandatory px-2 sm:px-4 pb-4">
        <div className="flex gap-3 sm:gap-4 w-max">
          {items.map((reel) => (
            <button 
              key={reel.id}
              onClick={() => onReelClick(reel)}
              className="w-32 h-56 sm:w-44 sm:h-72 shrink-0 rounded-2xl relative overflow-hidden group cursor-pointer shadow-sm border border-slate-200 snap-start text-right"
            >
              <img src={reel.thumbnailUrl} alt={reel.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10"></div>
              
              {/* Platform Badge */}
              <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md text-white rounded-full p-1.5 shadow-sm border border-white/10">
                {getPlatformIcon(reel.platform)}
              </div>

              {/* Play Button */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white border border-white/50 group-hover:bg-white/50 transition-colors">
                  <Play size={20} fill="currentColor" className="ml-1" />
                </div>
              </div>

              {/* Footer */}
              <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-1">
                <span className="text-white text-xs sm:text-sm font-bold line-clamp-2 leading-tight drop-shadow-md">
                  {reel.title}
                </span>
                <span className="text-white/80 text-[10px] font-medium drop-shadow-sm">
                  {reel.chefOrSource}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
