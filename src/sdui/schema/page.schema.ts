import { z } from 'zod';

export const DataBindingSchema = z.object({
  $bind: z.string(),
  params: z.unknown().optional()
});

export const SectionSchema = z.object({
  id: z.string(),
  type: z.enum(['hero_card', 'product_shelf', 'reels_shelf', 'category_bar']), // Types
  props: z.record(z.string(), z.unknown()), // Changed from any to unknown for safety
  visibility: z.object({
    enabled: z.boolean().default(true),
    devices: z.array(z.enum(['mobile', 'desktop'])).optional(),
  }).optional()
});

export const PageSchema = z.object({
  id: z.string(),
  sections: z.array(SectionSchema)
});

export type SDUISection = z.infer<typeof SectionSchema>;
export type SDUIPage = z.infer<typeof PageSchema>;
export type SDUIDataBinding = z.infer<typeof DataBindingSchema>;
