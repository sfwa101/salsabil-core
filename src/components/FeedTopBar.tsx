'use client';
// src/components/FeedTopBar.tsx
// شريط علوي لخلاصة بيان (اليوم 26، BAYAN-HOME-FEED-001) — عنوان بعناوين وهمية عبر BottomSheet
// (اليوم 25) — كما استُثني صراحة تخزين/جلب عناوين حقيقية من نطاق هذه المهمة، وأيقونتا باركود/بحث
// بتنبيه "قريباً" (لا وظيفة فعلية بعد). كل الألوان عبر توكنز دلالية فقط (ADR-007 §8.1) — بلا أي Hex
// مباشر هنا.
//
// اليوم 29: مبدّل العوالم الحقيقي (زر Globe الوهمي القديم) استُخرِج إلى WorldSwitcher.tsx المستقل —
// يقرأ worlds حقيقية الآن بدل توست "قريباً" ثابت.

import { useState } from 'react';
import { MapPin, Barcode, Search, ChevronDown } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { WorldSwitcher } from './WorldSwitcher';

interface FakeAddress {
  id: string;
  label: string;
  detail: string;
}

// عناوين وهمية بحتة — لا اتصال بقاعدة بيانات، لا حفظ فعلي. عنصر placeholder إلى حين بناء نطاق
// العناوين الحقيقي مستقبلاً.
const FAKE_ADDRESSES: FakeAddress[] = [
  { id: '1', label: 'المنزل', detail: 'شارع النموذج 12، القاهرة' },
  { id: '2', label: 'العمل', detail: 'برج التجربة، الجيزة' },
  { id: '3', label: 'عنوان آخر', detail: 'ميدان الاختبار، الإسكندرية' },
];

const TOAST_DURATION_MS = 2000;

export function FeedTopBar() {
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(FAKE_ADDRESSES[0].id);
  const [toast, setToast] = useState<string | null>(null);

  function showComingSoonToast() {
    setToast('قريباً');
    window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }

  const selectedAddress = FAKE_ADDRESSES.find((a) => a.id === selectedAddressId) ?? FAKE_ADDRESSES[0];

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-card px-4 py-3">
      {/* اليوم 31: مقياس العرض الموحَّد على الصف الداخلي فقط — الخلفية/الحدود أعلاه تبقيان كاملتي
          العرض (نمط شريط تنقّل قياسي: خلفية Full-bleed، محتوى مُمركَز). */}
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 md:max-w-4xl xl:max-w-6xl">
        <WorldSwitcher />

        <button
          type="button"
          onClick={() => setAddressSheetOpen(true)}
          className="flex flex-1 items-center gap-1 overflow-hidden text-start"
        >
          <MapPin size={18} className="shrink-0 text-primary" />
          <span className="truncate text-sm font-medium text-foreground">
            {selectedAddress.label} — {selectedAddress.detail}
          </span>
          <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={showComingSoonToast}
            aria-label="مسح الباركود"
            className="rounded-full border border-border p-2 text-foreground transition hover:bg-muted"
          >
            <Barcode size={20} />
          </button>
          {/* اليوم 31: مخفي من lg فصاعداً — شريط البحث مدموج الآن في Header.tsx (HeaderSearchBar)
              على الشاشات الكبيرة، تفادياً لازدواج نفس الوظيفة في مكانين. */}
          <button
            type="button"
            onClick={showComingSoonToast}
            aria-label="بحث"
            className="rounded-full border border-border p-2 text-foreground transition hover:bg-muted lg:hidden"
          >
            <Search size={20} />
          </button>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <span className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
            {toast}
          </span>
        </div>
      )}

      <BottomSheet open={addressSheetOpen} onClose={() => setAddressSheetOpen(false)} title="اختر العنوان">
        <ul className="flex flex-col gap-2">
          {FAKE_ADDRESSES.map((address) => (
            <li key={address.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedAddressId(address.id);
                  setAddressSheetOpen(false);
                }}
                className={`flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-start transition ${
                  address.id === selectedAddressId ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                }`}
              >
                <span className="font-medium text-foreground">{address.label}</span>
                <span className="text-sm text-muted-foreground">{address.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
}
