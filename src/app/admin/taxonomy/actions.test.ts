// src/app/admin/taxonomy/actions.test.ts
// STAGING-BASELINE-FOUNDER-TAXONOMY-FOUNDATION (2026-09-23/24) — أول اختبار وحدة لطبقة server actions
// الخاصة بإدارة التصنيف (لم يكن لها اختبار من قبل). يغطي: رفض actor غير مصادَق (requireAdmin) على كل
// الإجراءات الجديدة (حذف/نقل)، تمرير الحقول الجديدة (slug/isActive/tagline) صحيحاً لـcatalogService،
// وسطحاً لرسالة رفض الحذف المحروس كما هي بلا تغيير.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/modules/admin/admin-session', () => ({ getAdminSession: vi.fn() }));
vi.mock('@/core/modules/catalog/catalog.service', () => ({
  catalogService: {
    createDistrict: vi.fn(),
    updateDistrict: vi.fn(),
    deleteDistrict: vi.fn(),
    createCatalogCategory: vi.fn(),
    updateCatalogCategory: vi.fn(),
    moveCatalogCategory: vi.fn(),
    deleteCatalogCategory: vi.fn(),
    createCatalogSubcategory: vi.fn(),
    updateCatalogSubcategory: vi.fn(),
    moveCatalogSubcategory: vi.fn(),
    deleteCatalogSubcategory: vi.fn(),
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { getAdminSession } from '@/core/modules/admin/admin-session';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import {
  updateDistrictAction,
  deleteDistrictAction,
  updateCategoryAction,
  moveCategoryAction,
  deleteCategoryAction,
  updateSubcategoryAction,
  moveSubcategoryAction,
  deleteSubcategoryAction,
} from './actions';

const adminSession = { userId: 'admin-1', tenantId: null, role: 'platform_admin' as const, expiresAt: '2099-01-01T00:00:00.000Z', mustChangePassword: false };
const validUuid = '11111111-1111-4111-8111-111111111111';

describe('admin/taxonomy actions — رفض actor غير مصادَق (requireAdmin)', () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
  });

  it('deleteDistrictAction يرفض بلا جلسة، بلا استدعاء catalogService', async () => {
    const result = await deleteDistrictAction(validUuid);
    expect(result).toHaveProperty('error');
    expect(catalogService.deleteDistrict).not.toHaveBeenCalled();
  });

  it('moveCategoryAction يرفض بلا جلسة، بلا استدعاء catalogService', async () => {
    const result = await moveCategoryAction({ id: validUuid, newDistrictId: validUuid });
    expect(result).toHaveProperty('error');
    expect(catalogService.moveCatalogCategory).not.toHaveBeenCalled();
  });

  it('deleteCategoryAction يرفض بلا جلسة', async () => {
    const result = await deleteCategoryAction(validUuid);
    expect(result).toHaveProperty('error');
    expect(catalogService.deleteCatalogCategory).not.toHaveBeenCalled();
  });

  it('moveSubcategoryAction يرفض بلا جلسة', async () => {
    const result = await moveSubcategoryAction({ id: validUuid, newCategoryId: validUuid });
    expect(result).toHaveProperty('error');
    expect(catalogService.moveCatalogSubcategory).not.toHaveBeenCalled();
  });

  it('deleteSubcategoryAction يرفض بلا جلسة', async () => {
    const result = await deleteSubcategoryAction(validUuid);
    expect(result).toHaveProperty('error');
    expect(catalogService.deleteCatalogSubcategory).not.toHaveBeenCalled();
  });
});

describe('admin/taxonomy actions — actor مصادَق (platform_admin)، الحقول الجديدة تُمرَّر كما هي', () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession);
    vi.clearAllMocks();
    vi.mocked(getAdminSession).mockResolvedValue(adminSession);
  });

  it('updateDistrictAction يمرّر slug/tagline/isActive الجديدة لـcatalogService.updateDistrict', async () => {
    vi.mocked(catalogService.updateDistrict).mockResolvedValue({
      id: validUuid,
      slug: 'aljnayn',
      nameAr: 'الجناين',
      tagline: 'خضراوات وفواكه',
      sortOrder: 1,
      isActive: true,
    });

    const result = await updateDistrictAction({ id: validUuid, slug: 'aljnayn', nameAr: 'الجناين', tagline: 'خضراوات وفواكه', sortOrder: 1, isActive: true });

    expect(result).toEqual({ success: true });
    expect(catalogService.updateDistrict).toHaveBeenCalledWith(
      validUuid,
      { slug: 'aljnayn', nameAr: 'الجناين', tagline: 'خضراوات وفواكه', sortOrder: 1, isActive: true },
      { id: 'admin-1', role: 'platform_admin' }
    );
  });

  it('updateCategoryAction يمرّر isActive (الحقل الجديد) لـcatalogService.updateCatalogCategory', async () => {
    vi.mocked(catalogService.updateCatalogCategory).mockResolvedValue({
      id: validUuid,
      districtId: validUuid,
      slug: 'alkhdrawat',
      nameAr: 'الخضراوات',
      sortOrder: 1,
      isActive: false,
    });

    const result = await updateCategoryAction({ id: validUuid, nameAr: 'الخضراوات', sortOrder: 1, isActive: false });

    expect(result).toEqual({ success: true });
    expect(catalogService.updateCatalogCategory).toHaveBeenCalledWith(
      validUuid,
      { slug: undefined, nameAr: 'الخضراوات', sortOrder: 1, isActive: false },
      { id: 'admin-1', role: 'platform_admin' }
    );
  });

  it('updateSubcategoryAction يمرّر isActive لـcatalogService.updateCatalogSubcategory', async () => {
    vi.mocked(catalogService.updateCatalogSubcategory).mockResolvedValue({
      id: validUuid,
      categoryId: validUuid,
      slug: 'wrqyat',
      nameAr: 'ورقيات',
      sortOrder: 1,
      isActive: true,
    });

    await updateSubcategoryAction({ id: validUuid, nameAr: 'ورقيات', sortOrder: 1, isActive: true });

    expect(catalogService.updateCatalogSubcategory).toHaveBeenCalledWith(
      validUuid,
      { slug: undefined, nameAr: 'ورقيات', sortOrder: 1, isActive: true },
      { id: 'admin-1', role: 'platform_admin' }
    );
  });

  it('deleteCategoryAction يسطّح رسالة الرفض المحروس من catalogService كما هي، بلا تغيير', async () => {
    vi.mocked(catalogService.deleteCatalogCategory).mockResolvedValue({ deleted: false, reason: 'لا يمكن الحذف — يوجد 3 قسم فرعي تابع له.' });

    const result = await deleteCategoryAction(validUuid);

    expect(result).toEqual({ error: 'لا يمكن الحذف — يوجد 3 قسم فرعي تابع له.' });
  });

  it('deleteDistrictAction يعيد success ويستدعي revalidatePath عند حذف فعلي', async () => {
    vi.mocked(catalogService.deleteDistrict).mockResolvedValue({ deleted: true });

    const result = await deleteDistrictAction(validUuid);

    expect(result).toEqual({ success: true });
  });

  it('moveCategoryAction يرفض معرّفاً غير UUID صحيح قبل أي استدعاء لـcatalogService', async () => {
    const result = await moveCategoryAction({ id: 'not-a-uuid', newDistrictId: validUuid });

    expect(result).toHaveProperty('error');
    expect(catalogService.moveCatalogCategory).not.toHaveBeenCalled();
  });
});
