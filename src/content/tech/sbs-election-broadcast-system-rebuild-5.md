---
title: 'SBS 선거방송 시스템 리빌드 ⑤'
pubDate: 2025-12-13
tags: ['frontend', '선거방송', 'sbs']
draft: true
---

3편에서 "왜 웹이었나"를 설명하면서 이렇게 썼다.

> 웹이면 방송 중에 고쳐도 새로고침이면 끝난다
(마지막 줄이 얼마나 중요했는지는 나중에 따로 이야기하겠음)

이번 편이 그 '나중'이다.

---
## 델파이 시절의 핫픽스

다시 한번 델파이 시절의 방송 중 핫픽스를 떠올려보자.

```
`코드 수정 → exe 빌드 → 부조정실에 급하게 연락 → 파일 전달 → "이걸로 다시 받아서 실행해주세요"`
```

웹으로 오면서 이 문제는 절반만 풀렸다.

서버에 새 파일을 올리는 것은 쉬워졌다. 하지만 이미 방송 운영자들(PD,작가)에게 열려 있는 브라우저 화면은 그대로였다.

SPA는 처음 접속할 때 JS 번들을 한 번 받고, 그 다음부터는 브라우저 메모리 안에서 돈다. 부조정실 PC의 브라우저는 선거 당일 아침부터 밤까지 한 번도 닫히지 않는다. 서버에 아무리 새 버전을 올려도, 그 화면은 아침에 받은 코드를 계속 실행한다.

그래서 이번 편은 두 가지 이야기다.

1. 코드를 서버까지 어떻게 빠르게 올렸나
2. 서버에 올라간 코드를 이미 열려 있는 화면까지 어떻게 안전하게 가져갔나

---


## push 한 번으로 배포까지
우리는 사내 저장소로 Gitea를 쓴다.(이것조차 [개혁](https://otroven.github.io/tech/gitea-action-runner-setup/)이었던건 비밀...)

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

배포는 최대한 흐름을 단순하게 가져가려고 했다.


1. main에 push
2. 러너가 버전을 올리고
3. 러너 위에서 한 번 빌드해본다 (타입 에러, 빌드 에러가 있으면 여기서 멈춘다)
4. 통과하면 SSH로 웹 서버에 접속해서, 서버에서 최신 코드를 받고 다시 빌드한다

러너에서 빌드해보는 단계를 따로 둔 이유는, 서버에서 빌드가 깨지면 서비스 중인 결과물이 깨진 상태로 남을 수 있기 때문에 차라리 CI/CD 타임에 에러를 남기기 위해서 했다.

그리고 손으로 배포하는 유구한 역사와 습관이 남은 우리는 종종 배포할 때마다 버전을 까먹었다(^^)
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

* 버전은 `public/version/version.json` 한 파일에만
* push마다 patch를 1 올리고, 10이 되면 minor로 넘긴다 (1.0.9 → 1.1.0)
* 러너가 직접 커밋하고 push


커밋 메시지의 `[skip ci]`가 중요하다. 러너의 push도 push다. 
그래서 이게 없으면 버전 커밋이 다시 파이프라인을 실행하고, 그 파이프라인이 또 버전을 올리고… 무한 루프가 된다.

예를 들면

```
f32cfb8  2025-06-03 21:27:20  [운영 메뉴 153, 168 수정] sliceHuboByRank 에러 수정
abb7576  2025-06-03 21:27:28  chore: bump version to 1.6.1 [skip ci]
```

push하고 8초 뒤에 러너가 버전을 올렸다. (이 커밋이 뭐였는지는 마지막에 다시 나온다)

---
## 제발 시키는대로 업데이트 해주세요

서버에는 새 버전이 올라갔다. 이제 부조정실의 브라우저가 문제다. 그렇다면 이제 무엇을 기준으로 "**새 버전**"을 알아채야할까?

Vite는 빌드할 때 JS, CSS 파일 이름에 내용 기반 해시를 붙인다.

`dist/assets/index-3f9a1c2b.js`


코드가 바뀌면 파일 이름이 바뀐다. 그래서 새로고침만 하면 index.html이 새 파일 이름을 가리키고, 브라우저는 새 번들을 받는다. 반대로 말하면, 열려 있는 화면은 자기가 어떤 해시의 번들을 실행 중인지 신경 쓰지 않는다. 새로고침하기 전까지는 영원히 옛날 번들이다.

그래서 화면이 주기적으로 물어볼 수 있는 "**버전 신호**"가 필요했다. 앞에서 러너가 올린 `public/version/version.json`이 그 역할을 하도록 했다.(사실 버전을 체크하는 API가 있는게 맞다... 나도 안다... 그런데 너무 시간이 촉박했다...)

`public/` 폴더의 파일은 Vite가 해시 없이 그대로 복사하기 때문에 `/version/version.json` 파일은 배포가 몇 번 일어나든 항상 **같은 주소에서 최신 버전을 알려주는 파일**이 된다.

그래서 모든 메뉴 송출 화면 상단에서 사용할 `VersionCheck` 컴포넌트를 하나 만들었다.

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
* 로그인할 때 그 시점의 `version.json` 값을 `localStorage`에 저장한다. 이게 "실행 중인 버전"이다
* 5초마다 `version.json`을 다시 받아서 비교한다
* 서버 쪽이 더 새 버전이면, 초록색 `최신 버전 v1.6.0` 배지가 빨간색 `버전 업데이트 필요 [UPDATE]`로 바뀌어 깜빡인다.


WebSocket이나 SSE로 서버가 밀어주는 방식도 생각했지만, 그러려면 서버에 연결을 관리하는 무언가가 생겨야 했다.(및 백엔드 선배님들이 너무 바빴음)

정적 파일 하나와 `setInterval` 하나로 끝나는 구조가 선거 당일에는 단순하고 더 믿음직하다고 판단했다.

다만, 급하게 개발하다보니 마치 과거 '대학생인 나'가 개발한 것처럼 버전 비교 함수에서 실수를 했다^^(부끄럽다)


버전 비교 함수를 아래처럼 급하게 수정했다...

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


(잘 아시겠지만) `"1.9.9" < "1.10.0"`을 문자열로 비교하면 `false`다. 문자열 비교는 앞에서부터 한 글자씩 보기때문에, `"9"`와 `"1"`을 비교하는 순간 `"1.9.9"`가 더 크다고 나온다.

그리고 앞에서 본 버전 규칙(patch가 10이 되면 minor로)대로라면 1.9.9 다음은 정확히 1.10.0으로 된다. 문자열 비교였다면 버전이 두 자리로 넘어가는 순간 모든 화면에서 "현재 최신"으로 믿게 된다. 그래서 .으로 쪼개서 숫자로 바꾼 뒤 자리별로 비교하기로 했다!

그런데 새 버전을 감지했으면 그냥 location.reload() 해버리면 편하지 않을까? 라고 생각했다면, (**당신은 함정 카드에 걸렸다.**)


**송출 중인 화면에서 그러면 안 된다.**

SPA에서 새로고침은 메모리를 통째로 비운다. 지금 어떤 메뉴를 Cue/OnAir 했는지, 자동 송출 타이머가 몇 번째 장면을 돌고 있는지, 다음 송출까지 몇 초 남았는지. 이 모든게 전부 메모리에만 있는 상태다.

그런데 바이폰(그래픽 장비)은 우리 화면이 새로고침된 걸 모른다!!. 그래픽은 계속 방송에 나가고 있는데, 운영 화면만 "아무것도 안 하고 있는 초기 상태"로 돌아가버린다면? (**불일치 발생**)

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

`isOnAir`는 앱 전역 Context에 있는 값으로, 현재 메뉴의 데이터 중 하나라도 `ONAIR` 또는 `CUED` 상태면 `true`가 되도록 했다. CUED도 포함하는 이유는, Cue를 보낸 순간 바이폰은 이미 데이터를 받아 들고 ready 상태로 대기 중이기 때문이다. 이때 화면이 초기화되면 그 Cue를 회수할 방법이 사라진다.

정리하면, 업데이트가 일어나는 조건은 세 가지가 동시에 맞을 때로 정했다.

1. 서버에 새 버전이 있고
2. 지금 이 화면이 아무것도 송출하고 있지 않고
3. 운영 PD님이 직접 UPDATE를 눌렀을 때

**방송의 흐름을 결정하는 건 언제나 사람이다. 배포도 예외가 아니다.**

---
## 나의 두번째 선거방송 : 2026 지방선거

이 모든 파이프라인은 2025 대선이 끝나고 버려지지 않았고,2026 지방선거에서 그대로 다시 썼다. (드디어 소스를 복사해서 새 프로젝트를 만들지 않았다는 게 포인트다!)

이제 대망의 **6월 3일 밤**에 대해서 이야기를 하겠다.

개표 방송이 한창이던 밤 9시 반 쯤, 두 개의 방송 메뉴에 문제가 있다는 연락을 받았다. 1·2위 후보만 보여줘야 하는 메뉴인데, 1·2·3위로 자르고 있었다.


```diff
- /* 1,2,3위 필터 */
- const reSlicedMergedData = sliceHuboByRank(reMergedData, 3);
+ /* 1,2위 필터 */
+ const reSlicedMergedData = sliceHuboByRank(reMergedData, 2);
```
숫자 하나, 두 파일에서 같은 수정을 두 군데씩 해서 총 4줄.

```
21:27:20  수정 커밋 push
21:27:28  러너가 버전 bump → 빌드 검증 → 서버 배포
          부조정실 화면에 빨간 [UPDATE] 표시
          해당 메뉴를 송출하지 않는 타이밍에 PD님이 UPDATE 클릭
```

이제는 델파이 시절과 다르게 부조정실에 전화해서 "프로그램 끄고 이 파일로 다시 받아주세요"라고 부탁하지 않았다. 화면이 알아서 "새 버전이 있다"고 알려주고, PD님은 방송 흐름을 보다가 비는 타이밍에 버튼을 눌렀다.

비밀이지만(?) 하나만 더 고백하자면...

```
08:13  [Fix]: L06
08:21  [Fix]: L06 재배포
08:25  [Fix]: L06 최종 수정        ← 투표 진행 중, 12분 동안 세 번 배포
17:38  [Fix]: 712                  ← 출구조사 발표 직전
20:45  [Fix]: 147, 148, 164        ← 개표 방송 중
21:39  [Fix]: 상황판 전국 개표율 타이머
```

지방선거 당일에만 6번의 배포를 더 했다...! 

사실 델파이 시절이었다면 부조정실에 전화를 6번 걸었어야 했고, **물론** 클라이언트 프로그램도 다시 재배포하고 다시 설치해야했다. **물론** 그 중 세번은 **12분 안에**.

---

## THE END
다섯편에 걸쳐 20년 된 선거방송 시스템 리빌드 시리즈를 마무리했다.


그런데 연재를 마무리하면서 남기고 싶은 건 숫자보다 다른 이야기다.

처음 델파이 소스를 열었을 때 든 생각은 "이걸 사람이 했다고?"였다.

[2편](https://otroven.github.io/tech/sbs-election-broadcast-system-rebuild-2/)을 쓸 때만 해도 그 코드는 싸워야 할 대상이었다. 문서는 없고, 변수명은 암호 같고, 속성창 어딘가에 숨은 값 하나를 찾느라 하루를 날렸다.

그런데 직접 새 시스템을 만들어보고 나서야 알았다.
그 코드가 20년 동안 수십 번의 선거를, 수천만 명이 보는 생방송을 버텨냈다는 것.
그 시절의 도구로, 그 시절의 일정 안에서, 누군가는 매번 방송을 성공시켰다는 것.

이번에 만든 시스템도 언젠가는 레거시가 된다.
React도, Spring도, 지금 내가 당연하게 쓰는 것들도 20년 뒤에는 "이걸 사람이 했다고?"의 대상이 되어 있을 것이다.
(그때까지 이 코드가 살아남는다면 그것도 나름 영광이다)

그래서 이번에는 기술 스택보다 **다음 사람이 덜 싸우게 만드는 것**에 더 신경을 썼다.
화면과 통신을 나누고, 하드코딩을 데이터로 꺼내고, 배포를 사람 손에서 파이프라인으로 옮긴 것도 결국 같은 이유다.
2편에서 "과거의 나 자신, 그리고 그보다 더 과거의 누군가와의 싸움"이라고 썼는데, 미래의 누군가에게는 그 싸움을 조금이라도 덜 물려주고 싶었다.

1편에서 우리가 가공한 데이터가 실시간으로 송출되는 순간은 "설레기도 하지만 식은 땀이 흐른다"고 말했다.(긴장감 장난아님)

솔직히 그건 이번에도 똑같았다. 시스템이 바뀌어도 생방송의 긴장은 바뀌지 않는다.
달라진 게 있다면, 식은 땀이 흐르는 순간에 **고칠 수 있다는 확신**이 있었다는 것 정도다.

미래의 후배들이여, 다음 선거에서는 지난 소스를 복사하지 않아도 된다.
