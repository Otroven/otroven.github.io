export type CollectionKind = 'essays' | 'tech' | 'library';

export const COLLECTION_META: Record<
  CollectionKind,
  { label: string; path: string; description: string }
> = {
  essays: {
    label: 'Essay',
    path: '/essays',
    description: '나의 주관이 담긴 에세이',
  },
  tech: {
    label: 'Tech',
    path: '/tech',
    description: '기술에 관한 모든 것',
  },
  library: {
    label: 'Library',
    path: '/library',
    description: '읽은 책, 그리고 짧은 소감',
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
