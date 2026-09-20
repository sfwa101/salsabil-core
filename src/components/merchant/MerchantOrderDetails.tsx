// src/components/merchant/MerchantOrderDetails.tsx
// §31 بند 6 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §4/§29 بند 6) — اسم/هاتف العميل + عنوان
// التوصيل + سطور المنتجات، كانت غائبة تماماً عن واجهة التاجر رغم وجودها في DB. عرض بحت (Server
// Component، بلا تفاعل) يُركَّب فوق OrderRow.tsx المشترك مع لوحة الإدارة — لا تعديل على ذلك المكوّن.

import { roundToCents } from '@/core/kernel/money';

interface OrderLineItem {
  productName: string;
  quantity: number;
  unitPriceSnapshot: number;
}

interface MerchantOrderDetailsProps {
  customerName: string | null;
  customerPhone: string | null;
  addressLine1: string;
  addressCity: string;
  addressNotes?: string;
  items: OrderLineItem[];
}

export function MerchantOrderDetails({ customerName, customerPhone, addressLine1, addressCity, addressNotes, items }: MerchantOrderDetailsProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="font-medium text-foreground">{customerName ?? 'عميل غير معروف'}</span>
        {customerPhone && (
          <a href={`tel:${customerPhone}`} dir="ltr" className="text-primary underline">
            {customerPhone}
          </a>
        )}
      </div>
      <p className="text-muted-foreground">
        {addressLine1}، {addressCity}
        {addressNotes ? ` — ${addressNotes}` : ''}
      </p>
      <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
        {items.map((item, i) => {
          // اكتُشف حياً أثناء تحقق §31 بند 6 (نفس خلل IEEE 754 المُصلَح سابقاً في orders.service.ts
          // §31 بند 2): unitPriceSnapshot × quantity كضرب عشري خام في JS ينتج أرقاماً مثل
          // 99.94999999999999 بدل 99.95 (مثال حقيقي: 19.99 × 5). راجع core/kernel/money.ts.
          const lineTotal = roundToCents(item.unitPriceSnapshot * item.quantity);
          return (
            <div key={i} className="flex justify-between text-foreground">
              <span>
                {item.productName} × {item.quantity}
              </span>
              <span className="text-muted-foreground">{lineTotal} جنيه</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
