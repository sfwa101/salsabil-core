'use client';

import React from 'react';
import { X, Store, Building2, Truck, Globe } from 'lucide-react';
import Image from 'next/image';

export interface WorldTrayItem {
  id: string;
  name: string;
  tag: string;
  active: boolean;
  imageUrl?: string;
  iconName?: string;
}

export interface WorldsTrayProps {
  isOpen: boolean;
  onClose: () => void;
  worlds: WorldTrayItem[];
}

export const WorldsTrayStem: React.FC<WorldsTrayProps> = ({ isOpen, onClose, worlds }) => {
  const getIcon = (name?: string) => {
    switch (name) {
      case 'Store': return <Store className="w-6 h-6" />;
      case 'Building2': return <Building2 className="w-6 h-6" />;
      case 'Truck': return <Truck className="w-6 h-6" />;
      default: return <Globe className="w-6 h-6" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-scrim/20 backdrop-blur-[2px] z-40 transition-opacity duration-300 ease-out ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Tray */}
      <div 
        className={`fixed top-0 left-0 w-full z-50 bg-[var(--sb-bg-glass)] [backdrop-filter:var(--sb-blur-xl)] border-b border-border/40 shadow-lg transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'}`}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <span className="text-xs font-bold text-muted-foreground">العوالم والتطبيقات</span>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
            aria-label="إغلاق العوالم"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Worlds List */}
        <div className="flex flex-row gap-4 overflow-x-auto scrollbar-none py-4 px-4 w-full items-start">
          {worlds.map((world) => (
            <button 
              key={world.id}
              className={`flex flex-col items-center gap-2 shrink-0 group transition-opacity active:scale-95 ${world.active ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
              onClick={() => {
                // Future: handle world switch
                onClose();
              }}
            >
              <div className={`relative w-14 h-14 rounded-[var(--sb-radius-2xl)] flex items-center justify-center bg-[var(--sb-background)] border shadow-sm overflow-hidden transition-all duration-300 ${world.active ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-[var(--sb-card)]' : 'border-border/40 group-hover:border-primary/50'}`}>
                {world.imageUrl ? (
                  <Image src={world.imageUrl} alt={world.name} fill className="object-cover" />
                ) : (
                  <div className="text-muted-foreground">
                    {getIcon(world.iconName)}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5 mt-1">
                <span className={`text-[11px] font-bold ${world.active ? 'text-primary' : 'text-foreground'}`}>{world.name}</span>
                <span className="text-[9px] font-medium text-muted-foreground">{world.tag}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
