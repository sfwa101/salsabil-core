import React from 'react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { getBottomNavConfig } from '@/services/dynamic-nav-config';

export interface BottomNavStemProps {
  showBars?: boolean;
}

export const BottomNavStem: React.FC<BottomNavStemProps> = ({ showBars = true }) => {
  const items = getBottomNavConfig();

  return (
    <div className={`fixed bottom-5 inset-x-0 z-40 flex justify-center pointer-events-none transition-all duration-300 ease-out lg:hidden ${!showBars ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`} dir="rtl">
      <nav 
        className="pointer-events-auto h-14 w-full max-w-[360px] sm:max-w-sm rounded-full bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl flex items-center justify-between px-2"
      >
        {items.map((item) => {
          const Icon = (LucideIcons as any)[item.icon] || LucideIcons.HelpCircle;
          
          if (item.isHero) {
            return (
              <Link 
                key={item.id} 
                href="#" 
                className="w-12 h-12 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center -mt-3 transition-transform hover:scale-105 active:scale-95"
              >
                <Icon size={24} strokeWidth={2.5} />
              </Link>
            );
          }

          // Placeholder active logic (for now, make 'home' active)
          const isActive = item.id === 'home';

          return (
            <Link 
              key={item.id} 
              href="#" 
              className={`flex flex-col items-center justify-center gap-1 w-16 h-10 rounded-xl transition-colors active:scale-95 ${
                isActive ? 'bg-emerald-500/10 text-emerald-600' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
