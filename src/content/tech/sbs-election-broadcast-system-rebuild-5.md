---
title: 'SBS 선거방송 시스템 리빌드 ⑤'
pubDate: 2026-11-18
tags: ['frontend', '선거방송', 'sbs']
draft: true
---

3편에서 "왜 웹이었나"를 설명하면서 이렇게 썼다.

> 웹이면 방송 중에 고쳐도 새로고침이면 끝난다
> (마지막 줄이 얼마나 중요했는지는 나중에 따로 이야기하겠음)

이번 편이 그 '나중'이다.

---
## 델파이 시절의 핫픽스

다시 한번 델파이 시절의 방송 중 핫픽스를 떠올려보자.

```
`코드 수정 → exe 빌드 → 부조정실에 급하게 연락 → 파일 전달 → "이걸로 다시 받아서 실행해주세요"`
```

웹으로 오면서 이 문제는 절반만 풀렸다.

서버에 새 파일을 올리는 것은 쉬워졌다. 하지만 이미 방송 운영자들에게 열려 있는 브라우저 화면은 그대로였다.

SPA는 처음 접속할 때 JS 번들을 한 번 받고, 그 다음부터는 브라우저 메모리 안에서 돈다. 부조정실 PC의 브라우저 탭은 선거 당일 아침부터 밤까지 한 번도 닫히지 않는다. 서버에 아무리 새 버전을 올려도, 그 탭은 아침에 받은 코드를 계속 실행한다.

그래서 이번 편은 두 가지 이야기다.

1. 코드를 서버까지 어떻게 빠르게 올렸나
2. 서버에 올라간 코드를 이미 열려 있는 탭까지 어떻게 안전하게 가져갔나

---
## push 한 번으로 배포까지
우리는 사내 저장소로 Gitea를 쓴다.(이것조차 개혁이었던건 비밀...)

GitHub Actions와 거의 같은 문법의 Gitea Actions로 파이프라인을 만들었다.

```yaml
on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Update Version
        run: |
          # version.json의 버전을 올리고 커밋 (아래에서 설명)

      - name: 빌드 검증
        run: |
          npm install typescript
          npm run build

      - name: 메뉴 검증
        run: npm run validate-menus

      - name: 배포
        if: success()
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd "$DEPLOY_DIR"
            git pull origin main
            npm run build
```

최대한 흐름을 단순하게 가져가려고 했다.


1. main에 push
2. 러너가 버전을 올리고
3. 러너 위에서 한 번 빌드해본다 (타입 에러, 빌드 에러가 있으면 여기서 멈춘다)
4. 통과하면 SSH로 웹 서버에 접속해서, 서버에서 최신 코드를 받고 다시 빌드한다

러너에서 빌드해보는 단계를 따로 둔 이유는, 서버에서 빌드가 깨지면 서비스 중인 결과물이 깨진 상태로 남을 수 있기 때문에 차라리 CI/CI 타임에 에러를 남기기 위해서 했다.

그리고 손으로 배포하는 유구한 역사와 습관이 남은 우리는 종종 배포할 때마다 버전을 까먹었다 ^^
그래서 버전도 러너가 올리는 방향으로 정했다.

```bash
CURRENT_VERSION=$(jq -r '.curVersion' public/version/version.json)
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"

MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=$((VERSION_PARTS[2] + 1))

# patch가 10이 되면 minor를 올린다
if [ "$PATCH" -ge 10 ]; then
  MINOR=$((MINOR + 1))
  PATCH=0
fi

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
jq --arg version "$NEW_VERSION" '.curVersion = $version' \
  public/version/version.json > temp.json && mv temp.json public/version/version.json

git add public/version/version.json
git commit -m "chore: bump version to $NEW_VERSION [skip ci]"
git push
```

* 버전은 public/version/version.json 한 파일에만!
* push마다 patch를 1 올리고, 10이 되면 minor로 넘긴다 (1.0.9 → 1.1.0)
* 러너가 직접 커밋하고 push


커밋 메시지의 **[skip ci]**가 중요하다. 러너의 push도 push다. 
이게 없으면 버전 커밋이 다시 파이프라인을 실행하고, 그 파이프라인이 또 버전을 올리고… 무한 루프가 된다.

얼마나 빠르냐면, 2025년 6월 3일 밤의 기록은 이렇다.

```
f32cfb8  2025-06-03 21:27:20  [운영 메뉴 153, 168 수정] sliceHuboByRank 에러 수정
abb7576  2025-06-03 21:27:28  chore: bump version to 1.6.1 [skip ci]
```

push하고 8초 뒤에 러너가 버전을 올렸다. (이 커밋이 뭐였는지는 마지막에 다시 나온다)

---
## 제발 시키는대로 업데이트 해주세요

서버에는 새 버전이 올라갔다. 이제 부조정실 탭이 문제다. 그렇다면 이제 무엇을 기준으로 "새 버전"을 알아채야할까?

Vite는 빌드할 때 JS, CSS 파일 이름에 내용 기반 해시를 붙인다.

dist/assets/index-3f9a1c2b.js

코드가 바뀌면 파일 이름이 바뀐다. 그래서 새로고침만 하면 index.html이 새 파일 이름을 가리키고, 브라우저는 새 번들을 받는다. 반대로 말하면, 열려 있는 탭은 자기가 어떤 해시의 번들을 실행 중인지 신경 쓰지 않는다. 새로고침하기 전까지는 영원히 옛날 번들이다.

그래서 탭(앱)이 주기적으로 물어볼 수 있는 "**버전 신호**"가 필요했다. 앞에서 러너가 올린 public/version/version.json이 그 역할을 한다.(사실 버전을 체크하는 API가 있는게 맞다... 나도 안다... 그런데 너무 시간이 촉박했다...)

public/ 폴더의 파일은 Vite가 해시 없이 그대로 복사한다. 즉 /version/version.json은 배포가 몇 번 일어나든 항상 **같은 주소에서 최신 버전을 알려주는 파일**이 된다.

그래서 메뉴 송출 화면에서 항상 눈에 보이는 VersionCheck 컴포넌트를 하나 만들었다.

```ts
const SECONDS_TO_CHECK_VERSION = 5;

useEffect(() => {
  const checkVersion = async () => {
    const curVersionFromLocalStorage = localStorage.getItem("version");
    if (!curVersionFromLocalStorage) {
      alert("버전 정보가 없습니다. 다시 로그인 하시기 바랍니다.");
      router("/login");
    }

    const versionFromJson = await fetch("/version/version.json");
    const { curVersion } = await versionFromJson.json();

    if (compareVersions(curVersionFromLocalStorage!, curVersion)) {
      setIsVersionLatest(false);   // → 빨간 "UPDATE" 버튼 표시
    }
    setCurVersion(curVersion);
  };

  checkVersion();
  const interval = setInterval(checkVersion, SECONDS_TO_CHECK_VERSION * 1000);
  return () => clearInterval(interval);
}, []);
```
* 로그인할 때 그 시점의 version.json 값을 localStorage에 저장한다. 이게 "실행 중인 버전"이다
* 5초마다 version.json을 다시 받아서 비교한다
* 서버 쪽이 더 새 버전이면, 초록색 최신 버전 v1.6.0 배지가 빨간색 버전 업데이트 필요 [UPDATE]로 바뀌어 깜빡인다.


WebSocket이나 SSE로 서버가 밀어주는 방식도 있지만, 그러려면 서버에 연결을 관리하는 무언가가 생겨야 했다.(및 백엔드 선배님들이 너무 바빴음)

정적 파일 하나와 setInterval 하나로 끝나는 구조가 선거 당일에는 단순하고 더 믿음직하다고 판단했다.

다만, 급하게 개발하다보니 마치 과거 '대학생인 나'가 개발한 것 처럼 버전 비교 함수에서 실수를 했다^^(부끄럽다)


버전 비교 함수를 급하게 수정했고..

```ts
const compareVersions = (v1: string, v2: string): boolean => {
  const v1Parts = v1.split(".").map(Number);
  const v2Parts = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const a = v1Parts[i] || 0;
    const b = v2Parts[i] || 0;
    if (a !== b) return a < b;   // v1이 더 낮으면 true
  }
  return false;
};
```


(잘 아시겠지만) `"1.9.9" < "1.10.0"`을 문자열로 비교하면 `false`다. 문자열 비교는 앞에서부터 한 글자씩 보니까, `"9"`와 `"1"`을 비교하는 순간 `"1.9.9"`가 더 크다고 결론 내린다.

그리고 앞에서 본 버전 규칙(patch가 10이 되면 minor로)대로라면 1.9.9 다음은 정확히 1.10.0이다. 문자열 비교였다면 버전이 두 자리로 넘어가는 순간 모든 앱이 "나는 최신이다"라고 믿게 된다. 그래서 .으로 쪼개서 숫자로 바꾼 뒤 자리별로 비교하기로 했다!

그런데 새 버전을 감지했으면 그냥 location.reload() 해버리면 편하지 않을까? 라고 생각했다면, (**당신은 함정 카드에 걸렸다.**)


**송출 중인 화면에서 그러면 안 된다.**

SPA에서 새로고침은 메모리를 통째로 비운다. 지금 어떤 메뉴를 Cue/OnAir 했는지, 자동 송출 타이머가 몇 번째 장면을 돌고 있는지, 다음 송출까지 몇 초 남았는지. 전부 메모리에만 있는 상태다.

그런데 바이폰은 우리 탭이 새로고침된 걸 모른다. 그래픽은 계속 방송에 나가고 있는데, 운영 화면만 "아무것도 안 하고 있는 초기 상태"로 돌아간다.

그래서 업데이트는 사람이 누르는 걸로 하고, 그리고 송출 중에는 누를 수 없게 했다.
(근데 F5 누르는건 막을 수 있는데, 브라우저 새로고침 버튼까지는 못 막음...)


```ts
const { isOnAir } = useOnAir();

async function updateVersion() {
  if (isOnAir) {
    alert("현재 온에어 상태이므로 업데이트 할 수 없습니다.");
    return;
  }

  const versionFromJson = await fetch("/version/version.json");
  const { curVersion } = await versionFromJson.json();
  localStorage.setItem("version", curVersion);

  window.location.reload();
}
```

`isOnAir`는 앱 전역 Context에 있는 값이다. 현재 메뉴의 데이터 중 하나라도 `ONAIR` 또는 `CUED` 상태면 `true`가 된다. CUED도 포함하는 이유는, Cue를 보낸 순간 바이폰은 이미 데이터를 받아 들고 ready 상태로 대기 중이기 때문이다. 이때 화면이 초기화되면 그 Cue를 회수할 방법이 사라진다.

정리하면, 업데이트가 일어나는 조건은 세 가지가 동시에 맞을 때다.

1. 서버에 새 버전이 있고
2. 지금 이 화면이 아무것도 송출하고 있지 않고
3. 운영 PD님이 직접 UPDATE를 눌렀을 때

**방송의 흐름을 결정하는 건 언제나 사람이다. 배포도 예외가 아니다.**
