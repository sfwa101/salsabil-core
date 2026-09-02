// src/core/modules/payments/payment-provider.interface.ts
// واجهة تجريدية لطرق الدفع (Adapter Pattern) — docs/ARCHITECTURE.md §4
// إضافة مزوّد جديد = Adapter جديد فقط، منطق Orders الأساسي لا يتغيّر سطراً واحداً

export type PaymentMethod = 'cash_on_delivery';

export interface PaymentChargeResult {
  success: boolean;
  reference?: string;
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  charge(amount: number): Promise<PaymentChargeResult>;
}
