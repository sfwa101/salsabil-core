// src/core/modules/notifications/notification.service.ts
// §31 بند 10 — إشعارات SMS أساسية عند تغيّر حالة الطلب، للعميل والتاجر على الأقل (كما طلب البند
// صراحة). يستدعي khalilService/merchantService مباشرة لحل بيانات المستلمين (نفس نمط
// orders.service.ts، ADR-021) — لا وصول مباشر لجداول نطاقات أخرى من هنا.
//
// **لا يرمي أبداً** — الإشعار أثر جانبي غير حرج (Best-Effort)، فشل إرسال SMS يجب ألا يمنع أو يُلغي
// انتقال حالة طلب حقيقي نجح فعلاً (نفس فلسفة inventory.release_failed في orders.service.ts: يُسجَّل
// في audit_log، لا يُعاد رميه للمستدعي).
//
// ⚠️ اكتُشف حياً أثناء بناء هذا البند: audit_log يحمل قيداً معمارياً مُختبَراً صراحة (ADR-014،
// src/core/e2e/reef-city-journey.integration.test.ts → السيناريو 8) بأن **لا صف فيه إطلاقاً يحمل
// entity_type='order'** — دورة حياة الطلب مسجَّلة حصراً في order_status_history/
// merchant_suborder_status_history، عمداً، لا audit_log العام. أول تنفيذ لهذا الملف استخدم
// entity_type:'order' فكسر ذلك الاختبار فوراً (اختبار تكامل حقيقي، لا نظري). الإصلاح: entity_type
// هنا 'notification' حصراً — entityId يبقى معرّف الطلب (تتبّع كامل)، لكن entity_type يُميِّز هذا
// كحدث إشعار منفصل تماماً عن تصنيف "order" المحجوز حصراً لـorder_status_history.

import { sendSms, isSmsConfigured } from './sms-provider';
import { auditService } from '../audit/audit.service';
import { khalilService } from '../../kernel/khalil/service';
import { merchantService } from '../merchant/merchant.service';
import { ORDER_STATUS_LABELS_AR, type Order } from '../orders/types';

interface NotificationRecipient {
  userId: string;
  phone: string;
  message: string;
  recipientRole: 'customer' | 'merchant_owner';
}

export class NotificationService {
  async notifyOrderStatusChanged(order: Order): Promise<void> {
    try {
      const statusLabel = ORDER_STATUS_LABELS_AR[order.status];
      const shortId = order.id.slice(0, 8);

      const [customer, merchant] = await Promise.all([khalilService.findUserById(order.userId), merchantService.findById(order.tenantId)]);
      const merchantOwner = merchant ? await khalilService.findUserById(merchant.ownerId) : null;

      const recipients: NotificationRecipient[] = [];
      if (customer) {
        recipients.push({ userId: customer.id, phone: customer.phone, recipientRole: 'customer', message: `ريف: طلبك #${shortId} أصبح "${statusLabel}"` });
      }
      if (merchantOwner) {
        recipients.push({ userId: merchantOwner.id, phone: merchantOwner.phone, recipientRole: 'merchant_owner', message: `ريف: الطلب #${shortId} في متجرك أصبح "${statusLabel}"` });
      }

      await Promise.all(recipients.map((r) => this.sendAndLog(order, r)));
    } catch (e) {
      // فشل حتى في حل المستلمين (مثال: findUserById رمى استثناءً) — لا يجوز أن يكسر transitionStatus
      await auditService
        .log({
          actorRole: 'system',
          action: 'notification.sms_attempted',
          entityType: 'notification',
          entityId: order.id,
          metadata: { toStatus: order.status, sent: false, providerConfigured: isSmsConfigured(), errorMessage: e instanceof Error ? e.message : 'unknown error resolving recipients' },
        })
        .catch(() => {});
    }
  }

  private async sendAndLog(order: Order, recipient: NotificationRecipient): Promise<void> {
    const result = await sendSms(recipient.phone, recipient.message);
    await auditService
      .log({
        actorId: recipient.userId,
        actorRole: 'system',
        action: 'notification.sms_attempted',
        entityType: 'notification',
        entityId: order.id,
        metadata: {
          recipientRole: recipient.recipientRole,
          toStatus: order.status,
          sent: result.ok,
          providerConfigured: isSmsConfigured(),
          errorMessage: result.errorMessage,
          providerMessageId: result.providerMessageId,
        },
      })
      .catch(() => {});
  }
}

export const notificationService = new NotificationService();
