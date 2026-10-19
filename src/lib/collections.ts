export type CollectionKind = 'essays' | 'notes' | 'patterns' | 'library';

export const COLLECTION_META: Record<
  CollectionKind,
  { label: string; path: string; description: string }
> = {
  essays: {
    label: 'Essay',
    path: '/essays',
    description: '어느 정도 결론을 낸, 의견이 담긴 긴 글',
  },
  notes: {
    label: 'Note',
    path: '/notes',
    description: '아직 다 이해하지 못한 것들에 대한 느슨한 메모',
  },
  patterns: {
    label: 'Pattern',
    path: '/patterns',
    description: '반복해서 마주치는 설계·구현 패턴 모음',
  },
  library: {
    label: 'Library',
    path: '/library',
    description: '읽은 책과 자료, 그리고 짧은 소감',
  },
};

export const STAGE_META = {
  seed: { label: '씨앗', description: '막 심은 생각, 더 자랄 수 있음' },
  sapling: { label: '새싹', description: '자라는 중인 글, 계속 다듬는 중' },
  tree: { label: '나무', description: '어느 정도 정리되어 뿌리를 내린 글' },
} as const;

export type Stage = keyof typeof STAGE_META;

/** pubDate 기준 최신순 정렬 */
export function byDateDesc<T extends { data: { pubDate: Date } }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
