---
title: 'SBS 선거방송 시스템 리빌드 ④'
pubDate: 2025-11-29
tags: ['frontend', '선거방송', 'sbs']
---

## 바이폰 메뉴가 뭔데

1편에서 바이폰 운영 PD님이 "메뉴를 검색하고, 데이터를 확인하고, 송출 버튼을 누른다"고 했다. 여기서 말하는 메뉴는 TV에 나가는 그래픽 하나하나를 말한다.

'전국 투표율', '시도별 개표 현황', '서울 접전 지역 10곳', '후보 2인 맞대결'… 선거 당일 화면에 나오는 그래픽마다 번호가 붙어 있고, PD님은 번호로 메뉴를 찾는다.

메뉴는 대략 이런 기준으로 나뉜다.

* 위치: 화면 전체를 쓰는 상단 메뉴, 화면 아래 자막처럼 흐르는 하단 메뉴, 스튜디오 대형 화면용 PT 메뉴
* 단계: 투표 / 개표 / 예측(출구조사)
* 운영 방식: 사람이 한 장씩 넘기는 수동 / 정해진 초마다 알아서 넘어가는 자동

이 조합에 지역 단위(전국, 시도, 시군구, 권역)와 후보 수까지 곱해지면, 한 번의 선거에 메뉴가 백 단위로 생긴다. 2025 대선에서는 그게 184개였다.

---
## 델파이 시절: 메뉴 하나에 DLL 하나 ## 


델파이 시절에는 메뉴 하나당 DLL이 하나씩 있었다.

메뉴 301번이 있으면 301번 DLL이 있고, 그 안에 화면, 데이터 조회, 가공, 바이폰 전송이 전부 들어 있었다. 2편에서 보여준 `TFormA001`이 바로 그 DLL 안에 사는 폼이다.

이 구조의 장점은 분명했다. 메뉴끼리 서로 영향을 주지 않는다. 301번을 고치다가 302번이 깨질 일은 없다.

문제는 그 반대도 마찬가지라는 점이다. 공통으로 바꿔야 할 게 생기면, DLL을 하나씩 다 열어야 한다.

---
## 메뉴 하나에 폴더 하나 ## 


새 시스템에서도 "메뉴 하나 = 독립된 단위"라는 원칙은 그대로 가져왔다. 메뉴끼리 서로 영향을 주지 않는다는 장점은 선거방송에서 포기할 수 없었기 때문이다.

DLL 하나가 폴더 하나가 됐다.


```
src/pages/menus/
├── 301/page.tsx
├── 302/page.tsx
├── ...
└── 781/page.tsx
```

라우팅은 이 폴더 구조를 그대로 따라간다.



```ts
const MENU_ROUTERS = import.meta.glob("./pages/menus/[0-9]+/page.tsx", {
  eager: true,
});

const MenuModules = Object.keys(MENU_ROUTERS).map((key) => {
  const path = key.replace("./pages/", "").replace("/page.tsx", "");
  return {
    path, // "menus/301"
    component: React.createElement((MENU_ROUTERS[key] as any).default),
  };
});
```



새 메뉴를 만들 때 라우터를 따로 건드릴 필요가 없다. 숫자 이름의 폴더를 만들고 `page.tsx`를 넣으면 `/menus/301` 같은 주소가 자동으로 생긴다. PD님이 검색창에 메뉴 번호 세 자리를 입력하면 바로 그 주소로 이동한다.

DLL과 다른 점은, **폴더 바깥에 공통 부품이 있다**는 것이다.

### 메뉴라는건! ### 


모든 메뉴는 같은 생애주기를 가진다.

**조회 → Cue → OnAir → Reset**


* 조회: 데이터를 가져와서 화면 표에 보여준다. PD님이 눈으로 확인하는 단계
* Cue: 그래픽에 들어갈 데이터를 바이폰에 보낸다. 바이폰은 데이터를 받아 들고 ready 상태로 대기한다
* OnAir: 바이폰에 action 사인을 보낸다. 이 순간 그래픽이 방송에 나간다
* Reset: 처음 상태로 돌아간다

각 단계에서 누를 수 있는 버튼과 누를 수 없는 버튼이 정해져 있다. 조회도 안 했는데 OnAir를 누를 수 있으면 안 되고, OnAir 중인데 다시 조회를 누를 수 있으면 안 된다.



```js
const [buttonsDisableState, setButtonsDisableState] = useState({
  fetchDisable: false, // 조회
  cueDisable: true,    // Cue
  onAirDisable: true,  // OnAir
  resetDisable: false, // Reset
});
```
버튼 네 개의 활성/비활성 조합이 곧 메뉴의 상태다. Cue를 보내고 나면 조회와 Cue가 잠기고 OnAir만 열리는 식이다.

화면도 공통 컴포넌트를 조립해서 만든다.

```tsx
return (
  <div className="relative">
    <MenuHeaderWithResendTimer
      menuId={menuId}
      buttonsDisableState={buttonsDisableState}
      fetchHandler={fetchHandler}
      cueHandler={cueHandler}
      onAirHandler={onAirHandler}
      resetHandler={resetHandler}
    />
    <GridExchangeMenuTable fetchedData={fetchedData} ... />
  </div>
);
```
헤더는 메뉴의 운영 방식에 따라 고른다. 기본 헤더, 일정 시간 뒤 데이터를 다시 받아 보내는 재쿼리 헤더, 자동으로 넘어가는 타이머 헤더, PT용 헤더 등이 있다.

**테이블**은 보여줄 데이터 모양에 따라 고른다. 후보 중심 테이블(101개 메뉴), 지역 중심 테이블(21개 메뉴), 장면마다 그리드가 바뀌는 테이블(42개 메뉴)이다.

메뉴 페이지가 직접 하는 일은 "어떤 데이터를 가져와서, 어떤 레코드로 만들어 보낼지"뿐이다. 버튼, 단축키, 송출 상태 표시, 스크롤, 미개표 표시 같은 건 전부 공통 레이아웃이 알아서 한다.

---
## 같은 파일, 20개의 그래픽 ## 

여기서부터가 이번 편에서 제일 하고 싶었던 이야기다.

델파이 시절, '서울 내 10개 지역' 같은 메뉴는 **그 10개 지역 코드를 소스에 하드코딩**했다.

다음 선거에서 "이번엔 서울 말고 경기로 하자"고 하면? DLL을 열고, 지역 코드 10개를 바꾸고, 다시 빌드한다. "이번엔 후보 2명만 고정해서 보여주자"고 하면? DLL을 열고, 후보 기호를 바꾸고, 다시 빌드한다.

2편에서 쓴 "이번에는 후보가 6명이네 → 지난 소스 복사해서 후보수 수정"이 바로 이 이야기다.

그런데 메뉴들을 하나씩 옮기다 보니 이상한 걸 발견했다.

2025 대선 메뉴 중에 이런 것들이 있었다.

* 532~536번: 컬러프레임 2인
* 542, 543, 545번: 커튼월 2인
* 552~555번: 왕얼굴 2인
* 574번: 긁어라 대선 복권 (충청 내 10개 지역)
* 587, 588번: 국민이 주인 (대구경북·부울경 내 10개 지역)
* 590번: 국민이 주인 (1인가구 비율 상위 10개 지역)
* 632~634번: 맞수 2025 2인

TV로 보면 전혀 다른 그래픽이다. 디자인도, 연출도, 이름도 다르다. (작가님들의 작명 센스에 박수를)

그런데 **데이터 입장에서 보면 전부 같은 메뉴**다.

"정해진 지역 N곳에서, 정해진 후보들의 개표 결과를 가져와서, 수동으로 한 장씩 넘긴다."

달라지는 건 어느 지역이고 어느 후보인지, 그것뿐이다. 그렇다면 그걸 코드에서 빼면 된다.

### 테마
그래서 "어느 지역, 어느 후보"를 테마라는 데이터로 뺐다.

```ts
export interface ThemeGroup {
  themeMstId: string;
  themeMstName: string;
  regionType: string; // 선거구 | 시도 | 시군구 | 읍면동 | 권역
  huboFixYn: string;  // 후보 고정 여부
  ...
}

export interface ThemeDetail {
  themeDtlId: string;
  themeDtlOrder: string; // 노출 순서
  regionId: string;      // 어느 지역
  huboCnt: string;       // 몇 명
  hbjGihos: string[];    // 어느 후보들
  ...
}
```

테마 그룹은 "서울 내 10개 지역" 같은 묶음이고, 테마 상세는 그 안의 지역 하나하나와 그 지역에서 보여줄 후보들이다.

테마는 메뉴 관리 화면에서 만든다. 지역을 검색해서 추가하고, 후보를 고르고, 드래그앤드롭으로 순서를 바꾼다. 그리고 메뉴에 테마를 연결한다.

메뉴 페이지는 이렇게 동작한다.

```ts
export const useThemeData = (menuId: string) => {
  const regionIdsAndhbjGihosRef = useRef<
    { regionId: string; hbjGihos: string[] }[]
  >([]);

  useEffect(() => {
    const fetchDefaultThemeData = async () => {
      /* 1. 이 메뉴에 연결된 테마가 뭔지 */
      const menu = await fetchMenus(`/${menuId}`);
      const themeMstId = menu.themeMstId;

      /* 2. 그 테마의 지역과 후보 목록 */
      const themeDetails = await fetchThemeData(`/dtl/${themeMstId}`, "GET", {});

      regionIdsAndhbjGihosRef.current = themeDetails.map((data) => ({
        regionId: data.regionId,
        hbjGihos: data.hbjGihos,
      }));
    };

    fetchDefaultThemeData();
  }, [menuId]);

  return regionIdsAndhbjGihosRef;
};
```


1. 주소창에서 메뉴 번호를 읽는다 (/menus/552 → 552)
2. 메뉴 API에서 552번에 연결된 테마를 찾는다
3. 테마 API에서 그 테마의 지역과 후보 목록을 가져온다
4. 그 지역, 그 후보의 개표 데이터를 조회한다

코드 어디에도 "서울"이나 "기호 1번"은 없다.

그 결과, 위에 나열한 메뉴들을 포함한 20개 메뉴는 바이트 단위까지 완전히 똑같은 `page.tsx` 하나로 돌아간다. 메뉴 번호만 다르고, 그 번호에 연결된 테마가 다를 뿐이다.

184개 메뉴 중 이렇게 다른 메뉴와 같은 파일을 공유하는 메뉴가 72개, 테마를 쓰는 메뉴는 70개다.

"이번엔 서울 말고 경기로 하자"는 요청이 오면, 이제 코드를 열지 않는다. 메뉴 관리 화면에서 테마의 지역을 바꾸면 끝이다. 빌드도, 배포도 필요 없다.

---
## 메뉴는 누가 만드는가


여기까지 쓰고 나니 "메뉴 관리 화면"이 계속 나온다.

선거방송 메뉴는 우리 팀이 정하는 게 아니다.
* 메뉴를 기획하는 건 선거방송기획팀 작가님들이다. "이번 선거에선 이런 그래픽을 하자"
* 그래픽을 만드는 건 바이폰 그래픽 개발자분들이다
* 데이터를 붙이는 건 우리 팀이다
* 검수는 우리 팀과 방송 운영자분들이 같이 한다

한 메뉴에 네 개의 역할이 얽혀 있다.

그런데 예전에는 이 팀들이 **각자 다른 도구**를 썼다. 어떤 팀은 엑셀, 어떤 팀은 지라, 어떤 팀은 또 다른 무언가.

작가님이 엑셀에서 메뉴 이름을 바꾸면, 그게 지라에는 반영이 안 되어 있고, 우리 소스에는 옛날 이름이 남아 있다. "552번 그거 아직 개발 중이에요?"를 확인하려면 메신저로 물어봐야 했다. 메뉴가 수백 개인데, 진실은 여러 군데에 흩어져 있었다.

(선거 직전에 "그 메뉴 빠졌어요"라는 말을 듣는 것만큼 무서운 게 없다)

그래서 메뉴 관리를 시스템 안으로 들였다.

```ts
export interface MenuData {
  menuId: string;
  menuName: string;
  menuFeatures: string | null;
  menuType: MENU_TYPE;       // 상단 | 하단 | PT | 등급판정 ...
  menuStep: MENU_STEP;       // 투표 | 개표 | 예측
  menuOpType: MENU_OP_TYPE;  // 자동 | 수동
  themeMstId: string | null; // 연결된 테마
  menuStatus: MENU_STATUS;   // 신규 | 진행중 | 완료 | 재오픈 | 대기
  menuOwner: string | null;
  menuFeedback: string | null;
  menuReviewStatus: string | null; // 검수전 | 검수중 | 검수완료
  menuReviewFeedback: string | null;
  ...
}
```

작가님과 그래픽 개발자분들이 메뉴를 등록하고, 우리 팀이 개발 상태를 바꾸고, 검수하는 분들이 검수 상태와 피드백을 남긴다. 모두가 같은 화면, 같은 데이터를 본다.


그리고 여기서 중요한 건, **이 데이터가 문서가 아니라 시스템 그 자체**라는 점이다.

* 메뉴 화면 상단에 뜨는 메뉴 이름은 이 메뉴 데이터에서 가져온다
* 수동/자동 여부(`menuOpType`)에 따라 바이폰으로 보내는 마지막 장면 처리가 달라진다
* 테마(`themeMstId`)가 연결되어 있으면 위에서 본 방식으로 지역과 후보가 정해진다

작가님이 메뉴 관리 화면에서 메뉴 이름을 고치면, 송출 화면의 메뉴 이름이 바로 바뀐다. 엑셀과 소스가 따로 노는 일이 구조적으로 생길 수 없다.

---

정리하면,

* 메뉴 하나 = DLL 하나였던 구조는 메뉴 하나 = 폴더 하나로 옮겼다. 메뉴끼리 독립적이라는 장점은 지켰다
* 대신 버튼, 헤더, 테이블 같은 공통 부품은 폴더 바깥으로 뺐다
* 소스에 하드코딩되어 있던 "어느 지역, 어느 후보"는 테마라는 데이터로 뺐다
* 팀마다 흩어져 있던 메뉴 정보는 시스템 안으로 들였다

2편에서 "소스코드도 선거처럼 순환되었다"고 썼다. 이번에는 순환시키지 않아도 되는 걸 최대한 코드 밖으로 꺼냈다.

메뉴는 이렇게 정리됐다. 그런데 실제로 송출 버튼을 누르기 시작하자, 또 다른 문제가 기다리고 있었다.

**송출 버튼을 아주 빠르게 두 번 누르면 어떻게 될까?**


**생각만 해도 무섭다...**
