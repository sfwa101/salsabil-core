import React from 'react';
import Link from 'next/link';

export interface HorizontalShelfStemProps {
  title: string;
  actionLabel?: string;
  items: React.ReactNode[];
}

export const HorizontalShelfStem: React.FC<HorizontalShelfStemProps> = ({
  title,
  actionLabel,
  items
}) => {
  return (
    <div className="w-full flex flex-col gap-3 py-2" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {actionLabel && (
          <Link href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            {actionLabel}
          </Link>
        )}
      </div>

      {/* Scrollable Container */}
      <div className="flex flex-row flex-nowrap justify-start items-stretch gap-3 sm:gap-4 overflow-x-auto snap-x scrollbar-none pb-4 px-2 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {items.map((item, idx) => (
          <div key={idx} className="snap-start shrink-0">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};
