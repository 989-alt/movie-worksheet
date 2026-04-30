<div align="center">
<img width="1200" height="475" alt="CineEdu Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CineEdu — AI 영화 학습지 생성기

영화·드라마·다큐 한 편으로 40분 학습지를 자동 생성합니다. Vercel + Vite + React 19 + Gemini 2.5.

## Features

- **영화 직접 선택**: TMDB 자동완성으로 한국어 검색
- **AI 영화 추천 (3편 + 줄거리)**: 주제·연령 기반 추천, 클릭 즉시 학습지 생성
- **국내 OTT 표시**: TMDB Watch Providers (KR) 기반 Netflix · TVING · Wavve · Watcha · Disney+ 라벨
- **블록 에디터**: 텍스트·빈 박스·페이지 분리 + 드래그 정렬
- **PDF 내보내기**: A4 다중 페이지, 한국어 폰트(Noto Sans KR / Nanum Myeongjo / Nanum Pen) 정확 렌더링

## 환경 변수 (Vercel Project Settings → Environment Variables)

| Name | 필수 | 비고 |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google AI Studio에서 발급. 학습지·추천·OTT 분석에 사용 |
| `TMDB_API_KEY` | ✅ | https://www.themoviedb.org/settings/api 에서 발급. 검색·OTT providers에 사용 |

로컬 개발 시 `.env.local` 파일에 동일 키 작성:
```
GEMINI_API_KEY=...
TMDB_API_KEY=...
```

## 로컬 개발

```bash
npm install
npm run dev          # vercel dev (3000 포트, /api/* 서버리스 함수 자동 라우팅)
# 또는
npm run dev:vite     # vite만 실행 (API 호출은 실패함, UI 작업 전용)
```

## 빌드 & 배포

```bash
npm run build              # vite build → dist/
npm run typecheck          # tsc --noEmit
npm run build-curriculum-index  # data/curriculum/*.md → index.json
```

GitHub `main` 브랜치 push → Vercel 자동 배포.

## 교과서 단원 데이터 추가 (개발자)

```bash
# 1) scripts/parse-textbook.ts INPUTS 배열에 PDF 경로 추가
# 2) PDF → MD 변환 (Gemini 2.5 Pro, ~1분/PDF)
npm run parse-textbook -- --only=social --force
# 3) 옵시디언으로 data/curriculum/ vault 열기 → MD 검수·수정
# 4) 인덱스 재빌드
npm run build-curriculum-index
```

## 디렉토리

```
api/                  Vercel Serverless Functions
  tmdb-search.ts      TMDB multi 검색 (KR)
  tmdb-providers.ts   TMDB watch providers (KR)
  generate-worksheet.ts
  recommend-movies.ts
src/
  components/         UI
  services/           API 클라이언트
    geminiService.ts
    tmdb.ts
    ottService.ts
  utils/pdfGenerator.ts
```

## Roadmap

- [x] **Phase A**: Vercel API 마이그레이션, AI 추천 3편+줄거리, KR OTT 라벨, PDF 폰트 race 수정
- [x] **Phase C**: YouTube 링크 → 학년대(초1~2/3~4/5~6/중/고/부적합) 자동 판정 → 학습지 (Gemini 2.5 YouTube URL native 입력)
- [x] **Phase B (MVP)**: 교과서 단원 → 영화 추천 워크플로우. 6학년 사회 6-1·6-2 (5단원), 국어 6-1 가·나 (8단원) 총 13단원. 옵시디언 검수 가능
- [ ] Phase B 확장: 1~5학년 / 다른 출판사 / 영어·과학·도덕·실과 추가
