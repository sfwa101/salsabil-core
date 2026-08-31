# قاعدة البيانات — مرجع سريع

المزوّد: Supabase (Postgres)
راجع المخطط الكامل: SALSABIL_CONSTITUTION.md §8

جداول المرحلة الأولى (بالترتيب):
1. users (خليل - Identity)
2. tenants / merchants / stores (Tenant)
3. roles / permissions (Authorization)
4. products, categories, variants (Catalog)
5. orders, order_items, order_status_history (Orders)
6. inventory (Inventory)
7. audit_log (Audit)

القاعدة الذهبية: tenant_id يأتي فقط من JWT، أبداً من طلب العميل.
RLS مفعّل على كل جدول فيه بيانات متعددة المستأجرين.