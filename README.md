# otroven.github.io

[maggieappleton.com](https://maggieappleton.com/)을 참고해 만든 개인 기술
디지털 가든입니다. Astro + Content Collections로 만들어졌고, GitHub Actions를
통해 GitHub Pages(`otroven.github.io`)에 배포됩니다.

## 구조

| 컬렉션      | 경로      | 설명                                         |
| ----------- | --------- | -------------------------------------------- |
| **Essays**  | `/essays` | 어느 정도 결론을 낸, 의견이 담긴 긴 글        |
| **Tech**    | `/tech`   | 기술적인 메모, TIL, 반복해서 마주치는 패턴    |
| **Library** | `/library`| 읽은 책과 자료, 그리고 짧은 소감              |

각 글(essays/tech)에는 `stage`(씨앗 → 새싹 → 나무) 값으로
성장 단계를 표시합니다. 완벽하게 다듬어지지 않은 글도 공개하는 걸
전제로 한 구조입니다.

## 글 쓰는 법

`src/content/<collection>/` 아래에 마크다운 파일을 추가하면 됩니다.
프런트매터 스키마는 `src/content.config.ts`에서 확인하세요.

```markdown
---
title: '글 제목'
description: '한 줄 설명'
pubDate: 2026-10-19
tags: ['태그1', '태그2']
stage: 'seed' # seed | sapling | tree
---

본문 내용...
```

`library`는 `author`, `status`(읽는 중/완독/다시 읽기), `rating`(1~5,
선택) 필드를 추가로 받습니다.

## 로컬 개발

Astro 7은 **Node.js 22.22 이상**이 필요합니다.

```bash
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # dist/ 생성, 배포 전 로컬 검증용
pnpm preview   # 빌드 결과 미리보기
```

## 배포

`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 빌드 후
GitHub Pages로 자동 배포합니다. 리포지토리 설정의 **Settings → Pages →
Source**를 "GitHub Actions"로 지정해야 합니다.

## 커스터마이징 포인트

- `src/consts.ts` — 사이트 제목, 소개 문구, 내비게이션
- `src/styles/global.css` — 라이트/다크 테마 색상 토큰
- `astro.config.mjs` — `site` URL (GitHub 사용자명이 바뀌면 함께 수정)
