// src/components/merchant/MerchantOrderDetails.tsx
// §31 بند 6 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §4/§29 بند 6) — اسم/هاتف العميل + عنوان
// التوصيل + سطور المنتجات، كانت غائبة تماماً عن واجهة التاجر رغم وجودها في DB. عرض بحت (Server
// Component، بلا تفاعل) يُركَّب فوق OrderRow.tsx المشترك مع لوحة الإدارة — لا تعديل على ذلك المكوّن.

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
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-foreground">
            <span>
              {item.productName} × {item.quantity}
            </span>
            <span className="text-muted-foreground">{item.unitPriceSnapshot * item.quantity} جنيه</span>
          </div>
        ))}
      </div>
    </div>
  );
}
