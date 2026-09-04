'use server';
// عمليات لوحة إدارة بيان (اليوم 24، BAYAN-HOME-FEED-001) — كل دالة تتحقق أولاً من جلسة platform_admin
// فعلياً (getAdminSession)، نفس نمط src/app/admin/dashboard/actions.ts حرفياً.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { bayanService } from '@/core/modules/bayan/bayan.service';
import { POST_TYPES } from '@/core/modules/bayan/types';
import { uuidSchema } from '@/core/kernel/validation/schemas';

type ActionResult<T = undefined> = { success: true; data?: T } | { error: string };

// -- Zod: نفس بنية PostMediaLink التمييزية (types.ts) --

const noLinkSchema = z.object({ type: z.literal('none') });
const productLinkSchema = z.object({ type: z.literal('product'), productId: uuidSchema });
const recipeLinkSchema = z.object({
  type: z.literal('recipe'),
  title: z.string().trim().min(1, 'اسم الوصفة مطلوب'),
  baseFamilySize: z.number().int().positive('عدد أفراد العائلة يجب أن يكون أكبر من صفر'),
  ingredients: z
    .array(
      z.object({
        productId: uuidSchema,
        baseQuantity: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
      })
    )
    .min(1, 'الوصفة تحتاج مكوّناً واحداً على الأقل'),
});

const postMediaLinkSchema = z.discriminatedUnion('type', [noLinkSchema, productLinkSchema, recipeLinkSchema]);

const postMediaRowSchema = z.object({
  imageUrl: z.url('رابط صورة غير صحيح'),
  link: postMediaLinkSchema,
});

const postFieldsSchema = z.object({
  categoryId: uuidSchema,
  postType: z.enum(POST_TYPES),
  caption: z.string().trim().optional(),
  priority: z.number().int('الأولوية يجب أن تكون رقماً صحيحاً'),
  isPublished: z.boolean(),
  media: z.array(postMediaRowSchema),
});

export type PostFormInput = z.infer<typeof postFieldsSchema>;

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error('الجلسة غير صالحة — سجّل الدخول مجدداً');
  return session;
}

export async function createPostAction(input: PostFormInput): Promise<ActionResult<{ postId: string }>> {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }

  const parsed = postFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };
  }

  try {
    const worldScope = await bayanService.getIndividualsWorldId();
    const post = await bayanService.createPost({
      worldScope,
      categoryId: parsed.data.categoryId,
      postType: parsed.data.postType,
      caption: parsed.data.caption || undefined,
      priority: parsed.data.priority,
    });

    if (parsed.data.media.length > 0) {
      await bayanService.replacePostMedia(post.id, parsed.data.media);
    }
    if (parsed.data.isPublished) {
      await bayanService.updatePost(post.id, { isPublished: true });
    }

    revalidatePath('/admin/posts');
    return { success: true, data: { postId: post.id } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function updatePostAction(postId: string, input: PostFormInput): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }

  const idParsed = uuidSchema.safeParse(postId);
  if (!idParsed.success) {
    return { error: idParsed.error.issues[0]?.message ?? 'معرّف منشور غير صحيح' };
  }
  const parsed = postFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };
  }

  try {
    await bayanService.updatePost(idParsed.data, {
      categoryId: parsed.data.categoryId,
      postType: parsed.data.postType,
      caption: parsed.data.caption || undefined,
      priority: parsed.data.priority,
      isPublished: parsed.data.isPublished,
    });
    await bayanService.replacePostMedia(idParsed.data, parsed.data.media);

    revalidatePath('/admin/posts');
    revalidatePath(`/admin/posts/${idParsed.data}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function togglePublishAction(postId: string, isPublished: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }

  const parsed = uuidSchema.safeParse(postId);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'معرّف منشور غير صحيح' };
  }

  try {
    await bayanService.updatePost(parsed.data, { isPublished });
    revalidatePath('/admin/posts');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }

  const parsed = uuidSchema.safeParse(postId);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'معرّف منشور غير صحيح' };
  }

  try {
    await bayanService.deletePost(parsed.data);
    revalidatePath('/admin/posts');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}
