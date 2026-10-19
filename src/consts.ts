// 사이트 전역 설정. 이름/소개 문구는 자유롭게 바꿔도 됩니다.
export const SITE_TITLE = 'Otroven';
export const SITE_TAGLINE = '만들면서 배운 것들';
export const SITE_DESCRIPTION = '개발하면서 떠오른 생각과 배운 것들을 기록합니다.';
export const SITE_URL = 'https://otroven.github.io';

// 홈 히어로. 한 문장으로 "이 사이트는 무엇인가"를 말합니다.
export const HOME_HEADLINE = 'Otroven은 만들면서 배운 것들을 글로 남깁니다.';
export const HOME_SUBTITLE =
  '개발자. 코드와 책 사이에서 떠오른 생각을 기록합니다.';
export const HOME_BODY =
  '어느 정도 결론을 낸 글, 아직 정리되지 않은 메모, 읽은 책의 소감을 한곳에 모았습니다. 완성되지 않은 글도 그냥 둡니다.';
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
