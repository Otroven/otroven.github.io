---
title: 'Astro Content Collections로 멀티 섹션 블로그 구조 잡기'
description: '이 블로그 자체를 만들면서 정리한 Astro 콘텐츠 컬렉션 설정 노트.'
pubDate: 2026-10-05
tags: ['astro', 'typescript', 'til']
---

이 사이트 자체가 Astro의 Content Layer API로 만들어졌습니다. `essays`,
`tech`, `library` 세 컬렉션을 각각 다른 스키마로 선언해두고,
목록/상세 페이지는 거의 똑같은 패턴을 반복합니다.

핵심은 `src/content.config.ts`에서 `glob` 로더로 마크다운 폴더를
가리키고, 컬렉션마다 `zod` 스키마로 프런트매터를 검증하는 것입니다.

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const tech = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tech' }),
  schema: () =>
    z.object({
      title: z.string(),
      pubDate: z.coerce.date(),
      tags: z.array(z.string()).default([]),
    }),
});
```

아직 정리가 덜 된 부분들:

- 태그 페이지(`/tags/[tag]`)가 세 컬렉션을 모두 훑는데, 컬렉션이 늘어나면
  이 부분을 어떻게 일반화할지 고민 중입니다.
- 이미지 최적화(`astro:assets`)는 아직 손대지 않았습니다. 글에 이미지가
  많아지면 다시 돌아와야 할 듯합니다.

일단은 "작동하는 가장 단순한 형태"로 두고, 글이 쌓이면서 구조가
삐걱거리는 지점을 찾아 고치는 쪽으로 가보려고 합니다.
