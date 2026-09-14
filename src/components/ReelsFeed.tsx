'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Share2, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { useCartToast } from './useCartToast';

const MOCK_REELS = [
  {
    id: '1',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'عروض الخضار الطازج اليوم! 🍅🥦',
    merchantName: 'مزرعة الخير',
    likes: 124,
    comments: 12,
    product: {
      id: 'a437e593-75e0-4f63-8a9c-7ab61c9fa7bf', // Tomato from our seed
      name: 'طماطم بلدي طازجة',
      price: 18,
    }
  },
  {
    id: '2',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    title: 'بيض بلدي طازج من المزرعة 🥚',
    merchantName: 'مزارع الدواجن',
    likes: 342,
    comments: 45,
    product: {
      id: 'a2582161-6866-4683-9a96-df740a980bdf', // Eggs
      name: 'بيض بلدي طازج (طبق 30 بيضة)',
      price: 130,
    }
  }
];

export function ReelsFeed() {
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const { showToast, toastNode } = useCartToast();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPosition = container.scrollTop;
    const windowHeight = container.clientHeight;
    const index = Math.round(scrollPosition / windowHeight);
    if (index !== activeReelIndex && index >= 0 && index < MOCK_REELS.length) {
      setActiveReelIndex(index);
    }
  };

  const handleAddToCart = (productName: string) => {
    showToast(`تمت إضافة ${productName} إلى السلة!`);
    // Optimistic background action can go here
  };

  return (
    <div 
      className="h-[calc(100vh-140px)] w-full overflow-y-scroll snap-y snap-mandatory bg-black relative"
      onScroll={handleScroll}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        ::-webkit-scrollbar { display: none; }
      `}} />
      
      {MOCK_REELS.map((reel, index) => {
        const isActive = index === activeReelIndex;
        
        return (
          <div key={reel.id} className="h-full w-full snap-start relative flex items-center justify-center bg-zinc-900">
            {/* Video Background */}
            <video 
              src={reel.videoUrl} 
              autoPlay={isActive}
              loop 
              muted 
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            
            {/* Overlay Gradient for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />

            {/* Right Action Bar */}
            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10">
              <button className="flex flex-col items-center gap-1 text-white hover:text-primary transition">
                <div className="bg-black/20 p-3 rounded-full backdrop-blur-sm border border-white/10">
                  <Heart size={28} className={isActive ? 'fill-white' : ''} />
                </div>
                <span className="text-xs font-semibold drop-shadow-md">{reel.likes}</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-white hover:text-white/80 transition">
                <div className="bg-black/20 p-3 rounded-full backdrop-blur-sm border border-white/10">
                  <MessageCircle size={28} />
                </div>
                <span className="text-xs font-semibold drop-shadow-md">{reel.comments}</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-white hover:text-white/80 transition">
                <div className="bg-black/20 p-3 rounded-full backdrop-blur-sm border border-white/10">
                  <Share2 size={28} />
                </div>
                <span className="text-xs font-semibold drop-shadow-md">مشاركة</span>
              </button>
            </div>

            {/* Bottom Info Area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10 pb-6 pr-4 pl-20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {reel.merchantName.charAt(0)}
                </div>
                <span className="text-white font-bold text-shadow">{reel.merchantName}</span>
                <button className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full backdrop-blur-sm transition border border-white/20">
                  متابعة
                </button>
              </div>
              <p className="text-white/90 text-sm mb-4 text-shadow line-clamp-2 leading-relaxed">
                {reel.title}
              </p>
              
              {/* Shoppable Product Card inside Reel */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex items-center justify-between shadow-lg">
                <div className="flex flex-col">
                  <span className="text-white font-semibold text-sm line-clamp-1">{reel.product.name}</span>
                  <span className="text-primary-foreground font-extrabold">{reel.product.price} ج.م</span>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleAddToCart(reel.product.name)}
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 shadow-[var(--sb-shadow-pill)]"
                >
                  <ShoppingBag size={16} className="ml-1" />
                  شراء الآن
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      {toastNode}
    </div>
  );
}
