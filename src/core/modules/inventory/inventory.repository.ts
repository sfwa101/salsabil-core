// src/core/modules/inventory/inventory.repository.ts
// الاتصال بقاعدة البيانات الخاص بالمخزون — لا منطق أعمال هنا، فقط قراءة/كتابة
// القراءة عامة (RLS يسمح بها فعلاً — docs/DATABASE.md §6)، فالعميل العام كافٍ لها.
// الكتابة (خصم/استرجاع) تستخدم service_role — هذا أول كود كتابة فعلي على inventory في المشروع،
// يحسم OPEN_QUESTION الموثَّق في docs/SECURITY.md §5 ("سياسات الكتابة على inventory غير موجودة
// بعد — تُحسَم عند بناء أول ميزة كتابة فعلية") بنفس النمط المتَّبع لكل جدول لا سياسة كتابة له
// (merchants/carts/orders): service_role يتجاوز RLS، لا حاجة لسياسة anon جديدة.

import { supabase } from '../../kernel/database/supabase-client';
import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import type { InventoryRecord } from './types';

interface InventoryRow {
  product_id: string;
  quantity_available: number;
  cost_price: number | null;
  updated_at: string;
}

function toInventoryRecord(row: InventoryRow): InventoryRecord {
  return {
    productId: row.product_id,
    quantityAvailable: row.quantity_available,
    costPrice: row.cost_price ?? undefined,
    updatedAt: row.updated_at,
  };
}

export class InventoryRepository {
  async findByProductId(productId: string): Promise<InventoryRecord | null> {
    const { data, error } = await supabase.from('inventory').select('*').eq('product_id', productId).maybeSingle();
    if (error) throw error;
    return data ? toInventoryRecord(data as InventoryRow) : null;
  }

  // CRITICAL-FIXES-FROM-AUDIT-001، بند 2 — خصم ذرّي شرطي يحل سباق TOCTOU الذي كان قائماً بين
  // isAvailable() (قراءة) وقرار المتصل المنفصل بالمتابعة. Supabase-js (PostgREST) لا يدعم تعبيراً
  // نسبياً مثل "quantity_available = quantity_available - X" في .update() مباشرة — الخياران
  // الوحيدان لذرّية حقيقية هما دالة RPC في Postgres (تتطلب Migration جديدة تُطبَّق يدوياً عبر
  // SQL Editor، غير قابلة للتحقق في هذه الجلسة لعدم وجود اتصال Postgres مباشر، راجع ADR-018) أو
  // Optimistic Concurrency هنا: القراءة أولاً، ثم UPDATE واحد مشروط بمطابقة القيمة المقروءة
  // بالضبط (WHERE quantity_available = <القيمة الأصلية>). كل UPDATE في Postgres ذرّي على مستوى
  // الجملة نفسها لصف واحد — لو عدَّل طرف آخر الصف بين قراءتنا وكتابتنا، شرط المطابقة يفشل ولا
  // يتأثر أي صف (0 نتائج)، فنكتشف التعارض ونعيد المحاولة بقراءة جديدة بدل الكتابة فوق قيمة قديمة.
  async decrementIfAvailable(productId: string, quantity: number, maxAttempts = 3): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const current = await this.findByProductId(productId);
      if (!current || current.quantityAvailable < quantity) return false;

      const { data, error } = await supabaseAdmin
        .from('inventory')
        .update({ quantity_available: current.quantityAvailable - quantity, updated_at: new Date().toISOString() })
        .eq('product_id', productId)
        .eq('quantity_available', current.quantityAvailable) // القفل التفاؤلي: لا يُطابِق إلا القيمة التي قرأناها بالضبط
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (data) return true; // نجح الخصم — لم يُعدِّل أحد الصف بيننا

      // 0 صفوف تأثرت: طرف آخر عدَّل الكمية بين قراءتنا وكتابتنا (سباق حقيقي) — أعد المحاولة بقراءة جديدة
    }
    return false; // استُنفدت المحاولات تحت تزاحم شديد — رفض البيع أسلم من المخاطرة ببيع مضاعف
  }

  // تعويضي (بند 3، Transaction Boundaries) — يُستدعى فقط عند فشل خطوة لاحقة في checkout() بعد
  // خصم ناجح لهذا المنتج بالذات (فشل دفع/إنشاء طلب/بنود) لإعادة الكمية المخصومة. لا قفل تفاؤلي
  // هنا عمداً: نطاق استدعائه ضيق (تعويض فوري لخصم واحد معروف)، لا مسار متزامن حقيقي يتنافس عليه.
  async restore(productId: string, quantity: number): Promise<void> {
    const current = await this.findByProductId(productId);
    if (!current) return; // لا سجل مخزون لمنتج نجح خصمه للتو — حالة غير متوقعة، لا شيء نعيده إليه
    const { error } = await supabaseAdmin
      .from('inventory')
      .update({ quantity_available: current.quantityAvailable + quantity, updated_at: new Date().toISOString() })
      .eq('product_id', productId);
    if (error) throw error;
  }

  // CATALOG-IMPORT-WORKFLOW (ADR-031) — استبدال كامل (لا جمع تراكمي) لكمية/تكلفة منتج تاجر عند
  // كل استيراد Excel: الملف يمثّل "الكمية المتاحة الآن"، لقطة كاملة لا فرقاً تراكمياً. مستقل تماماً
  // عن decrementIfAvailable/restore أعلاه (تلك تخص استهلاك Checkout الذري، هذه تخص تحديث المخزون
  // المصدري من التاجر) — لا قفل تفاؤلي هنا عمداً، لا مسار تزامن حقيقي يتنافس مع استيراد Excel.
  async upsertForImport(productId: string, quantityAvailable: number, costPrice: number): Promise<InventoryRecord> {
    const { data, error } = await supabaseAdmin
      .from('inventory')
      .upsert(
        { product_id: productId, quantity_available: quantityAvailable, cost_price: costPrice, updated_at: new Date().toISOString() },
        { onConflict: 'product_id' }
      )
      .select('*')
      .single();
    if (error) throw error;
    return toInventoryRecord(data as InventoryRow);
  }
}

export const inventoryRepository = new InventoryRepository();
