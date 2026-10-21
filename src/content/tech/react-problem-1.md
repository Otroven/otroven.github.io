---
title: '어느 날 들어온 리액트 문제 출제 건'
pubDate: 2026-09-22
tags: ['react']
---

저번주에 지인에게 부탁을 받아서 주니어 프론트엔드 개발자 면접관으로 참여했다.

(`내가 과연 면접관으로 참여해도 되는지 100번 정도 물어봄.....`)

나의 역할은 1단계 절차에 참여해서 현장에서 코드를 보여주고 해당 코드의 개선점을 묻는 역할이었다.

본업이 너무 바빴기 때문에.... 

면접 전날이 되어서야 자리에 앉아서 5년전 나의 모습을 떠올리며 어떤 문제가 좋을지 깊이 고민하기 시작했다.

사실 요즘같은 대 AI 시대에 '이 기술 써봤나요?', '이런거 만들어 보셨나요?' 같은 체크형 질문은 **진짜 쓸모가 없다**. 지엽적인 개념을 콕 찝어 물어보는 핀포인트성 질문도 마찬가지다.

그래서 지인에게 어떤 개발자를 뽑고 싶냐고 물어봤는데, 단순한 '**리액트 개발자**'가 아니라 실력있는 '**개발자**'를 원한다고 했다. 그래서 정말 리액트를 잘 알고 있는지 묻는 문제를 만들어야겠다고 고민했다.
(근데 원래 성격같았으면 CS, 아니면 V8 물어볼 것 같습니다 ㅋㅋㅋㅋ..)

리액트를 처음 배울 때 누구나 가장 먼저 접하고 가장 자주 쓰는 것이 바로 `useState`입니다. 그렇다면 `useState`를 진짜 잘 이해하고 있는지를 집중적으로 물어보기 위해 문제를 만들었습니다.


실제 면접을 진행해보니 아쉽게도 많은 지원자분들이 긴장을 너무 많이 하셔서 코드의 핵심 포인트를 캐치하지 못하셨습니다. 대부분은 리액트의 리렌더링을 정확하게 알지 못하셨고, 특히 마운트와 리렌더링의 개념적 차이를 혼동하는 모습이 눈에 띄었습니다.



이번 면접을 통해 만들어 본 아래 문제 코드가 이제 막 프론트엔드 개발에 입문하는 주니어 개발자분들에게 도움이 되길 바랍니다.


<iframe src="https://codesandbox.io/embed/3628rd?view=split&fontsize=12&module=%2Fsrc%2FApp.js"
     style="width:100%; height: 500px; border:0; border-radius: 4px; overflow:hidden;"
     title="usestate-fundamental"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>
