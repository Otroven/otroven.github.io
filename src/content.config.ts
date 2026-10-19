import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 성장 단계: 씨앗(막 심은 생각) → 새싹(자라는 중) → 나무(정리된 결론)
const stage = z.enum(['seed', 'sapling', 'tree']).default('sapling');

const essays = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/essays' }),
  schema: () =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      stage,
      draft: z.boolean().default(false),
    }),
});

const tech = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tech' }),
  schema: () =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      stage,
      draft: z.boolean().default(false),
    }),
});

const library = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/library' }),
  schema: () =>
    z.object({
      title: z.string(),
      author: z.string(),
      status: z.enum(['읽는 중', '완독', '다시 읽기']).default('완독'),
      rating: z.number().min(1).max(5).optional(),
      pubDate: z.coerce.date(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
    }),
});

export const collections = { essays, tech, library };
