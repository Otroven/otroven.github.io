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
    description: '기술적인 메모, TIL, 반복해서 마주치는 패턴',
  },
  library: {
    label: 'Library',
    path: '/library',
    description: '읽은 책과 자료, 그리고 짧은 소감',
  },
};

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
