// 사이트 전역 설정. 이름/소개 문구는 자유롭게 바꿔도 됩니다.
export const SITE_TITLE = "Otroven";
export const SITE_TAGLINE = "미래의 나를 위해";
export const SITE_DESCRIPTION =
  "개발하면서 떠오른 생각과 배운 것들을 기록합니다.";
export const SITE_URL = "https://otroven.github.io";

// 홈 히어로. 한 문장으로 "이 사이트는 무엇인가"를 말합니다.
export const HOME_HEADLINE1 = "기술을 활용해서";
export const HOME_HEADLINE2 = "비즈니스를 고민해야 합니다";
export const HOME_SUBTITLE = "안녕하세요. 개발자 조현빈입니다.";
export const HOME_BODY = `저는 헤비(Heavy) 독서가로, 다양한 지식을 추구하고 여러 분야의 본질에 관심이 많습니다.\n
  테크니컬한 지식 외에도 심리학, 철학, 특히 수학에 관심이 많고 여러 분야의 지식을 활용하여 내가 마주한 비즈니스의 문제를 해결하는 데 관심이 많습니다. 
  `;

export const AUTHOR_NAME = "Otroven";
export const GITHUB_USERNAME = "Otroven";
export const GITHUB_URL = `https://github.com/${GITHUB_USERNAME}`;

export const NAV_LINKS = [
  { href: "/essays/", label: "Essays" },
  { href: "/tech/", label: "Tech" },
  { href: "/library/", label: "Library" },
  { href: "/now/", label: "Now" },
  { href: "/about/", label: "About" },
] as const;
