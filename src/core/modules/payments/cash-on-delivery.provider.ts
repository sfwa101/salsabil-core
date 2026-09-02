// src/core/modules/payments/cash-on-delivery.provider.ts
// التطبيق الوحيد الفعلي لـ PaymentProvider اليوم — الدفع نقداً عند التسليم، لا معالجة فعلية

import type { PaymentChargeResult, PaymentProvider } from './payment-provider.interface';

export class CashOnDeliveryProvider implements PaymentProvider {
  readonly method = 'cash_on_delivery' as const;

  async charge(_amount: number): Promise<PaymentChargeResult> {
    return { success: true };
  }
}

export const cashOnDeliveryProvider = new CashOnDeliveryProvider();
