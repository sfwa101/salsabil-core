import React from 'react';
import Image from 'next/image';

export interface CategoryStem {
  id: string;
  name: string;
  image?: string;
  active?: boolean;
}

export interface CategoryBarStemProps {
  categories: CategoryStem[];
  onSelect?: (id: string) => void;
}

export const CategoryBarStem: React.FC<CategoryBarStemProps> = ({
  categories,
  onSelect
}) => {
  return (
    <div 
      className="flex flex-row gap-3 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-2 py-2"
      dir="rtl"
    >
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect?.(cat.id)}
          className={`flex flex-col items-center gap-2 shrink-0 group transition-opacity hover:opacity-90 active:scale-95 ${cat.active ? 'opacity-100' : 'opacity-75'}`}
          aria-label={cat.name}
        >
          {/* Squircle Image/Icon Container (Strict Apple Squircle) */}
          <div className={`relative w-16 h-20 sm:w-20 sm:h-24 rounded-[var(--sb-radius-2xl)] bg-[var(--sb-background)] flex items-center justify-center overflow-hidden shrink-0 shadow-sm border transition-colors ${cat.active ? 'border-primary' : 'border-border/40 group-hover:border-primary/50'}`}>
            {cat.image ? (
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-[var(--sb-radius-2xl)]"
                sizes="(max-width: 640px) 4rem, 5rem"
              />
            ) : (
              // لا صورة (فئات/أحياء بلا حقل صورة في البيانات، مثال: District) — بديل حرف أول الاسم فوق
              // تدرّج بتوكنز --sb-primary/--sb-accent (لا Hex حرفي، يعمل صحيحاً عبر أي [data-world]،
              // يتجنّب مخالفة design-system/no-literal-tailwind-colors — راجع DECISION-DEBT-001).
              <div
                className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--sb-primary)] to-[var(--sb-accent)]"
                aria-hidden="true"
              >
                <span className="text-2xl font-black text-[var(--sb-primary-foreground)]">
                  {cat.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          
          {/* Label */}
          <span className={`text-xs text-center transition-colors ${cat.active ? 'font-bold text-primary' : 'font-medium text-foreground'}`}>
            {cat.name}
          </span>
        </button>
      ))}
    </div>
  );
};
