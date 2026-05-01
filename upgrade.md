🚀 Antigravity Development Plan: Movie Worksheet Upgrade
프로젝트 개요: 현재의 movie-worksheet 프로젝트(Next.js 기반)를 리팩토링하여 한국형 콘텐츠 검색 최적화, 렌더링 버그 수정, 그리고 멀티모달(YouTube/AI 추천) 기능을 추가한다. 별도의 백엔드 없이 Vercel Serverless Functions(API Routes)를 활용한다.

🛠 Phase 0: 환경 설정 (Environment Setup)
지시 사항:

이 프로젝트는 Next.js 기반이다. npm install을 실행하여 의존성을 설치하라.

YouTube 자막 추출을 위해 필요한 라이브러리를 추가로 설치하라.

Bash

npm install youtube-transcript
.env.local 파일이 없다면 생성하고, 사용자가 입력할 NEXT_PUBLIC_TMDB_API_KEY와 OPENAI_API_KEY 변수 슬롯을 만들어라.

⚡ Phase 1: 검색 로직 코어 수정 (Search Logic Optimization)
목표: 한국 OTT 콘텐츠(드라마, 예능) 검색 누락 해결 및 정확도 향상.

작업 상세:

API 엔드포인트 변경:

TMDB API 호출 함수를 찾아라 (보통 lib/, api/, 또는 메인 컴포넌트 내부).

기존 엔드포인트 /search/movie를 **/search/multi**로 변경하라. (영화뿐만 아니라 TV 시리즈도 검색되도록 함).

파라미터 강제 적용:

API 호출 시 다음 파라미터를 하드코딩 또는 기본값으로 설정하라.

language: 'ko-KR'

region: 'KR'

include_adult: false

데이터 필터링:

결과값 중 media_type이 person인 경우는 제외하고 movie와 tv만 필터링하여 리스트에 노출하라.

🎨 Phase 2: 렌더링 파이프라인 수술 (Rendering Fix)
목표: 학습지 폰트 변경 후 미리보기/PDF 생성 시 이전 폰트가 나오는 버그 수정.

작업 상세:

Canvas 캡처 로직 수정:

html2canvas를 사용하는 함수(예: downloadPDF 등)를 찾아라.

캡처 직전, 브라우저 폰트 로딩 대기 로직을 삽입하라: await document.fonts.ready;

html2canvas 옵션에 { useCORS: true }를 반드시 추가하라.

강제 리렌더링 (State Flushing):

폰트 변경 State가 적용된 후, DOM이 확실히 업데이트되도록 setTimeout을 사용하여 약 300~500ms의 딜레이를 준 후 캡처가 시작되도록 로직을 비동기로 처리하라.

📺 Phase 3: 유튜브 링크 분석기 탑재 (Serverless Feature)
목표: 유튜브 링크 입력 시 자막을 추출하여 학습지 생성 프롬프트에 주입.

작업 상세:

Serverless API 생성:

pages/api/youtube.js (또는 app/api/youtube/route.js) 파일을 생성하라.

youtube-transcript 라이브러리를 사용하여 입력받은 URL의 자막을 추출하는 로직을 작성하라.

추출된 자막 텍스트(Transcript)를 하나의 문자열로 합쳐서 JSON으로 반환하라.

프론트엔드 UI 추가:

검색창 근처에 "YouTube 링크로 만들기" 토글(또는 탭)을 추가하라.

링크 입력 후 '생성' 버튼 클릭 시 위에서 만든 API를 호출하고, 반환된 자막 텍스트를 기존의 '줄거리(Plot)' 변수에 할당하여 AI 학습지 생성 로직을 그대로 재사용하라.

🧠 Phase 4: AI 영화 큐레이터 (Recommendation Agent)
목표: 키워드/기분 기반 영화 추천 및 즉시 학습지 생성 연결.

작업 상세:

추천 모드 UI 개발:

"무엇을 볼지 모르겠나요? (AI 추천)" 버튼을 메인 화면에 배치하라.

클릭 시 텍스트 입력창(Textarea)을 띄워라. (예: "우울할 때 볼만한 영화 추천해줘")

Structured Output 구현:

OpenAI API 호출 시, 단순 텍스트가 아닌 JSON Array 포맷으로 응답받도록 프롬프트를 조정하라.

포맷: [{ title: "영화제목", reason: "추천이유" }, ...]

워크플로우 연결:

추천된 영화 리스트를 카드 형태로 보여주고, 사용자가 카드를 클릭하면 해당 영화 제목으로 자동으로 Phase 1의 검색 로직을 실행하여 학습지 생성 단계로 넘어가라.