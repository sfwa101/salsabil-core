'use client';
// src/components/DeliveryAddressButton.tsx
// عنوان التوصيل تحت اسم "ريف المدينة" مباشرة في Header.tsx —
// CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01 (الجزء 2). استُخرج حرفياً من منطق FeedTopBar.tsx
// المحذوف في هذه المهمة نفسها (نفس العناوين الوهمية، نفس BottomSheet، بلا أي تغيير سلوكي) — فقط
// تغيّر مكان العرض (داخل الهيدر لا شريط منفصل تحته) وحجمه البصري (نص أصغر ليلائم موضعه تحت العنوان).
//
// عناوين وهمية بحتة — لا اتصال بقاعدة بيانات، لا حفظ فعلي. عنصر placeholder إلى حين بناء نطاق
// العناوين الحقيقي مستقبلاً (نفس القيد الموثَّق أصلاً في FeedTopBar.tsx السابق).

import { useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

interface FakeAddress {
  id: string;
  label: string;
  detail: string;
}

const FAKE_ADDRESSES: FakeAddress[] = [
  { id: '1', label: 'المنزل', detail: 'شارع النموذج 12، القاهرة' },
  { id: '2', label: 'العمل', detail: 'برج التجربة، الجيزة' },
  { id: '3', label: 'عنوان آخر', detail: 'ميدان الاختبار، الإسكندرية' },
];

export function DeliveryAddressButton() {
  const [open, setOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(FAKE_ADDRESSES[0].id);

  const selectedAddress = FAKE_ADDRESSES.find((a) => a.id === selectedAddressId) ?? FAKE_ADDRESSES[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex max-w-[12rem] items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <MapPin size={12} className="shrink-0 text-primary" />
        <span className="truncate">
          {selectedAddress.label} — {selectedAddress.detail}
        </span>
        <ChevronDown size={12} className="shrink-0" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="اختر العنوان">
        <ul className="flex flex-col gap-2">
          {FAKE_ADDRESSES.map((address) => (
            <li key={address.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedAddressId(address.id);
                  setOpen(false);
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
    </>
  );
}
