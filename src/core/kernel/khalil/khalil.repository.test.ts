// src/core/kernel/khalil/khalil.repository.test.ts
// اختبارات وحدة (mocked) للدوال الأربع الجديدة في اليوم 19/20 (worlds/user_personas، ADR-018) —
// تُموّه عميل supabaseAdmin نفسه (لا شبكة حقيقية)، عكس src/core/modules/orders/orders.integration.test.ts
// الذي يضرب Supabase حياً. لا اختبار تكامل مكافئ بعد — مؤجَّل، لا مستهلك service.ts حتى اليوم (اليوم 21).
//
// ⚠️ ملاحظة نمط: بقية دوال khalil.repository.ts (findUserById، createSession، إلخ) لم تُختبَر وحدياً
// من قبل في هذا المستودع — تُختبَر فقط عبر تكامل حي (orders.integration.test.ts) أو عبر service.test.ts
// (الذي يموّه khalilRepository نفسه، لا عميل Supabase). هذا الملف يموّه طبقة أعمق (عميل Supabase) لأن
// اليوم 20 محدود صراحة بـ types.ts/khalil.repository.ts بلا أي تعديل على service.ts — لا طبقة أعلى بعد
// يمكن تمويهها بنفس نمط service.test.ts القائم.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../database/supabase-admin-client', () => ({
  supabaseAdmin: { from: vi.fn() },
}));
vi.mock('../database/supabase-client', () => ({
  supabase: { from: vi.fn() },
}));

const { khalilRepository } = await import('./khalil.repository');
const { supabaseAdmin } = await import('../database/supabase-admin-client');

/**
 * بناء سلسلة استعلام Supabase مُموَّهة تدعم .select/.eq/.insert (تُعيد نفسها للتسلسل) وتنتهي إما
 * بـ .maybeSingle()/.single() الصريحتين، أو بـ await مباشر بعد .eq() (نمط listActiveWorlds) عبر then().
 */
function makeQueryBuilder(terminal: { data: unknown; error: unknown }) {
  const builder: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    then: (onFulfilled: (value: typeof terminal) => unknown) => unknown;
  } = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => terminal),
    single: vi.fn(async () => terminal),
    then: (onFulfilled) => Promise.resolve(terminal).then(onFulfilled),
  };
  return builder;
}

const worldRow = {
  id: 'world-1',
  slug: 'individuals',
  name: 'الأفراد',
  description: 'العالم الافتراضي للأفراد',
  is_active: true,
  created_at: '2026-09-04T00:00:00.000Z',
};

const personaRow = {
  id: 'persona-1',
  user_id: 'user-1',
  world_id: 'world-1',
  is_default: true,
  created_at: '2026-09-04T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('KhalilRepository.findWorldBySlug', () => {
  it('يعيد null إن لم يوجد عالم بهذا الـslug', async () => {
    const builder = makeQueryBuilder({ data: null, error: null });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    const result = await khalilRepository.findWorldBySlug('غير موجود');

    expect(result).toBeNull();
    expect(supabaseAdmin.from).toHaveBeenCalledWith('worlds');
    expect(builder.eq).toHaveBeenCalledWith('slug', 'غير موجود');
  });

  it('يحوّل صف العالم الموجود لشكل World (camelCase)', async () => {
    const builder = makeQueryBuilder({ data: worldRow, error: null });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    const result = await khalilRepository.findWorldBySlug('individuals');

    expect(result).toEqual({
      id: 'world-1',
      slug: 'individuals',
      name: 'الأفراد',
      description: 'العالم الافتراضي للأفراد',
      isActive: true,
      createdAt: '2026-09-04T00:00:00.000Z',
    });
  });

  it('يرمي الخطأ كما هو عند فشل الاستعلام', async () => {
    const dbError = new Error('connection error');
    const builder = makeQueryBuilder({ data: null, error: dbError });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    await expect(khalilRepository.findWorldBySlug('individuals')).rejects.toThrow('connection error');
  });
});

describe('KhalilRepository.listActiveWorlds', () => {
  it('يعيد فقط العوالم النشطة محوَّلة لشكل World', async () => {
    const builder = makeQueryBuilder({ data: [worldRow], error: null });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    const result = await khalilRepository.listActiveWorlds();

    expect(result).toEqual([
      { id: 'world-1', slug: 'individuals', name: 'الأفراد', description: 'العالم الافتراضي للأفراد', isActive: true, createdAt: '2026-09-04T00:00:00.000Z' },
    ]);
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('يعيد مصفوفة فارغة بلا خطأ إن لم توجد عوالم نشطة', async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    const result = await khalilRepository.listActiveWorlds();

    expect(result).toEqual([]);
  });
});

describe('KhalilRepository.findPersonaByUserAndWorld', () => {
  it('يعيد null إن لم توجد شخصية لهذا المستخدم في هذا العالم', async () => {
    const builder = makeQueryBuilder({ data: null, error: null });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    const result = await khalilRepository.findPersonaByUserAndWorld('user-1', 'world-1');

    expect(result).toBeNull();
    expect(supabaseAdmin.from).toHaveBeenCalledWith('user_personas');
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'world_id', 'world-1');
  });

  it('يحوّل صف الشخصية الموجودة لشكل UserPersona (camelCase)', async () => {
    const builder = makeQueryBuilder({ data: personaRow, error: null });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    const result = await khalilRepository.findPersonaByUserAndWorld('user-1', 'world-1');

    expect(result).toEqual({ id: 'persona-1', userId: 'user-1', worldId: 'world-1', isDefault: true, createdAt: '2026-09-04T00:00:00.000Z' });
  });
});

describe('KhalilRepository.createPersona', () => {
  it('يُدرج isDefault=false افتراضياً إن لم يُمرَّر', async () => {
    const builder = makeQueryBuilder({ data: { ...personaRow, is_default: false }, error: null });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    const result = await khalilRepository.createPersona({ userId: 'user-1', worldId: 'world-1' });

    expect(builder.insert).toHaveBeenCalledWith({ user_id: 'user-1', world_id: 'world-1', is_default: false });
    expect(result.isDefault).toBe(false);
  });

  it('يمرّر isDefault=true صراحة عند تمريرها', async () => {
    const builder = makeQueryBuilder({ data: personaRow, error: null });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    await khalilRepository.createPersona({ userId: 'user-1', worldId: 'world-1', isDefault: true });

    expect(builder.insert).toHaveBeenCalledWith({ user_id: 'user-1', world_id: 'world-1', is_default: true });
  });

  it('يرمي الخطأ كما هو عند فشل الإدراج (مثال حي متوقَّع: تكرار الفهرس الجزئي، 23505)', async () => {
    const constraintError = Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
    const builder = makeQueryBuilder({ data: null, error: constraintError });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    await expect(khalilRepository.createPersona({ userId: 'user-1', worldId: 'world-1', isDefault: true })).rejects.toMatchObject({ code: '23505' });
  });
});
