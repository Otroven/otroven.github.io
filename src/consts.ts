// 사이트 전역 설정. 이름/소개 문구는 자유롭게 바꿔도 됩니다.
export const SITE_TITLE = '뜨락';
export const SITE_TAGLINE = '자라는 생각들의 기록';
export const SITE_DESCRIPTION =
  '개발과 디자인, 그 사이에서 떠오른 생각들을 씨앗부터 나무까지 길러보는 작은 뜨락입니다.';
export const SITE_URL = 'https://otroven.github.io';
export const AUTHOR_NAME = 'Otroven';
export const GITHUB_USERNAME = 'Otroven';
export const GITHUB_URL = `https://github.com/${GITHUB_USERNAME}`;

export const NAV_LINKS = [
  { href: '/essays/', label: 'Essays' },
  { href: '/notes/', label: 'Notes' },
  { href: '/patterns/', label: 'Patterns' },
  { href: '/library/', label: 'Library' },
  { href: '/now/', label: 'Now' },
  { href: '/about/', label: 'About' },
] as const;
