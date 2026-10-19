export type CollectionKind = 'essays' | 'tech' | 'library';

export const COLLECTION_META: Record<
  CollectionKind,
  { label: string; path: string; description: string }
> = {
  essays: {
    label: 'Essay',
    path: '/essays',
    description: '어느 정도 결론을 낸, 의견이 담긴 긴 글',
  },
  tech: {
    label: 'Tech',
    path: '/tech',
    description: '기술적인 메모, TIL, 반복되는 패턴을 적어두는 곳',
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
