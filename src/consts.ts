// 사이트 전역 설정. 이름/소개 문구는 자유롭게 바꿔도 됩니다.
export const SITE_TITLE = 'otroven';
export const SITE_TAGLINE = '만들면서 배운 것들';
export const SITE_DESCRIPTION = '개발하면서 떠오른 생각과 배운 것들을 기록합니다.';
export const SITE_URL = 'https://otroven.github.io';
export const AUTHOR_NAME = 'Otroven';
export const GITHUB_USERNAME = 'Otroven';
export const GITHUB_URL = `https://github.com/${GITHUB_USERNAME}`;

export const NAV_LINKS = [
  { href: '/essays/', label: 'Essays' },
  { href: '/tech/', label: 'Tech' },
  { href: '/library/', label: 'Library' },
  { href: '/now/', label: 'Now' },
  { href: '/about/', label: 'About' },
] as const;
