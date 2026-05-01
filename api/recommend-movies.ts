import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { allowedRatingsForAge, filterByAge, ratingRulesForPrompt } from './_age-rating.js';
import { findOttByName, maxCertForAge } from './_ott-mapping.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash';

function cleanJson<T = any>(text: string): T {
  let s = text.trim();
  if (s.startsWith('```json')) s = s.slice(7);
  if (s.startsWith('```')) s = s.slice(3);
  if (s.endsWith('```')) s = s.slice(0, -3);
  return JSON.parse(s.trim());
}

interface TmdbCandidate {
  id: number;
  title: string;
  originalTitle: string;
  year: string;
  overview: string;
  popularity: number;
  voteAverage: number;
  certification: string;
}

/**
 * TMDB Discover로 특정 OTT에서 시청 가능한 인기 영화 후보 목록 조회.
 * - watch_region=KR로 한국 내 시청 가능 영화만
 * - 인기순 정렬
 * - 페이지 1~2 (각 20편 = 최대 40편)
 * - release_dates 별도 호출로 KR 등급 추출
 */
async function fetchTmdbCandidatesByOtt(
  providerId: number,
  age: number
): Promise<TmdbCandidate[]> {
  if (!TMDB_API_KEY) return [];

  const fetchPage = async (page: number) => {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      with_watch_providers: String(providerId),
      watch_region: 'KR',
      sort_by: 'popularity.desc',
      include_adult: 'false',
      include_video: 'false',
      language: 'ko-KR',
      'vote_count.gte': '20',
      page: String(page),
    });
    const res = await fetch(`https://api.themoviedb.org/3/discover/movie?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  };

  // 2페이지 병렬 조회
  const [p1, p2] = await Promise.all([fetchPage(1), fetchPage(2)]);
  const raw = [...p1, ...p2];
  if (raw.length === 0) return [];

  // KR 등급 정보 — release_dates를 영화별 병렬 조회 (상위 30편만)
  const top = raw.slice(0, 30);
  const allowedCerts = new Set(maxCertForAge(age));

  const enriched = await Promise.all(
    top.map(async (m: any) => {
      let cert = '';
      try {
        const rdRes = await fetch(
          `https://api.themoviedb.org/3/movie/${m.id}/release_dates?api_key=${TMDB_API_KEY}`
        );
        if (rdRes.ok) {
          const rd = await rdRes.json();
          const kr = (rd.results || []).find((r: any) => r.iso_3166_1 === 'KR');
          if (kr?.release_dates?.length) {
            // 가장 최근 등급
            const latest = [...kr.release_dates].sort(
              (a: any, b: any) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
            )[0];
            cert = (latest?.certification || '').trim();
          }
        }
      } catch {
        /* swallow */
      }
      return {
        id: m.id,
        title: m.title || m.original_title || '',
        originalTitle: m.original_title || '',
        year: (m.release_date || '').slice(0, 4),
        overview: m.overview || '',
        popularity: m.popularity || 0,
        voteAverage: m.vote_average || 0,
        certification: cert,
      } as TmdbCandidate;
    })
  );

  // 등급 필터: 빈 등급(미상)은 보수적으로 통과시키되 우선순위 낮춤 → 일단 포함하고 Gemini가 거름
  return enriched.filter((c) => {
    if (!c.certification) return true; // 미상은 통과 (Gemini 단계에서 거름)
    return allowedCerts.has(c.certification);
  });
}

/**
 * KR cert (TMDB) → KMRB 한글 표기 변환
 */
function krCertToKmrb(cert: string): string {
  switch (cert.trim()) {
    case 'All': return '전체관람가';
    case '12': return '12세이상관람가';
    case '15': return '15세이상관람가';
    case '19': return '청소년관람불가';
    default: return '';
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured',
      hint: 'Vercel Project Settings → Environment Variables에 GEMINI_API_KEY 추가 + Deployment 재실행 필요. /api/diag로 현재 변수 확인 가능.',
    });
  }

  const { topic, ottPlatform, targetAge } = req.body || {};
  if (!topic) {
    return res.status(400).json({ error: 'topic is required' });
  }

  const age = Number(targetAge) || 12;

  // ── 1. OTT 매핑 시도 ──────────────────────────────────────────────
  const ott = findOttByName(ottPlatform);
  let tmdbCandidates: TmdbCandidate[] = [];

  if (ott && TMDB_API_KEY) {
    try {
      tmdbCandidates = await fetchTmdbCandidatesByOtt(ott.id, age);
    } catch (e: any) {
      console.error('[TMDB Discover Error]:', e?.message || e);
      tmdbCandidates = [];
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    let prompt: string;

    if (ott && tmdbCandidates.length > 0) {
      // ── A. TMDB 후보가 있는 경우 — Gemini가 그 안에서만 선택 ───────────
      const candidateList = tmdbCandidates
        .slice(0, 25)
        .map(
          (c, i) =>
            `${i + 1}. 「${c.title}」 (${c.year || '?'}) [등급:${krCertToKmrb(c.certification) || '미상'}] [원제:${c.originalTitle}]\n   줄거리: ${c.overview.slice(0, 200)}`
        )
        .join('\n');

      prompt = `[영화 추천 요청 — 학교 수업용 학습지 자료]
대상 학생 만 나이: ${age}세
선택 OTT: 「${ott.displayName}」
관심 주제/테마: 「${topic}」

${ratingRulesForPrompt(age)}

[★OTT 검증된 후보 목록 — 반드시 이 목록 안에서만 선택★]
아래는 ${ott.displayName}에서 한국에서 실제로 시청 가능한 영화 후보입니다.
이 목록 밖의 영화는 절대 추천하지 마세요. 다른 OTT에 있는 영화를 추천하면 안 됩니다.

${candidateList}

[★주제 연관성 엄수★]
- 「${topic}」와 명확하고 직접적으로 연결되는 영화를 위 목록에서 골라주세요.
- 단순히 비슷한 분위기가 아닌, 영화의 핵심 주제·메시지·줄거리가 「${topic}」를 직접 다루는 작품
- 후보 줄거리만 보고 판단해 주세요. topicConnection 필드에 어떤 줄거리/메시지가 「${topic}」와 연결되는지 1~2문장.

[추천 조건]
- 정확히 3편 (서로 다른 영화)
- 만 ${age}세에게 적합한 등급만
- 위 목록에 없는 영화는 절대 추천 금지

반드시 아래 JSON 배열로만 응답하세요(정확히 3개):
[
  {
    "title": "영화제목 (위 목록의 한국어 표기 그대로)",
    "year": "개봉연도",
    "genre": "장르",
    "koreanRating": "전체관람가" | "12세이상관람가" | "15세이상관람가",
    "reason": "왜 이 ${age}세 학생에게 좋은지 1~2문장",
    "topicConnection": "「${topic}」와 어떻게 직접 연결되는지 1~2문장",
    "plotSummary": "줄거리 5~7문장 (제공된 줄거리를 확장·교육용으로 다듬어주세요)"
  }
]`;
    } else {
      // ── B. TMDB 후보 없음 — 기존 LLM 추천 + 등급 필터로 폴백 ─────────
      const ottHint = ott
        ? `「${ott.displayName}」 (TMDB 검색 실패 — LLM 지식으로 시청 가능 여부 추정)`
        : ottPlatform
          ? `「${ottPlatform}」 (지원 매핑에 없는 OTT — LLM 지식으로 추정)`
          : '한국에서 시청 가능한 모든 플랫폼(Netflix, Disney+, TVING, Wavve, Watcha, 쿠팡플레이 등)';

      prompt = `[영화 추천 요청 — 학교 수업용 학습지 자료]
대상 학생 만 나이: ${age}세
선호 OTT: ${ottHint}
관심 주제/테마: 「${topic}」

${ratingRulesForPrompt(age)}

[★주제 연관성 엄수★]
각 추천 영화는 「${topic}」와 명확하고 직접적으로 연결되어야 합니다.
- 단순히 비슷한 분위기/장르가 아니라, 영화의 핵심 주제·메시지·등장인물이 「${topic}」를 직접 다뤄야 함
- 추측·연관 강제 금지. 확신이 들지 않으면 추천하지 마세요.
- topicConnection 필드에 어떤 장면·인물·줄거리 요소가 「${topic}」와 어떻게 연결되는지 구체적으로 1~2문장.

[추천 조건]
- 한국에서 합법적으로 시청 가능한 영화·드라마 우선
- 정확히 3편 (각각 다른 영화, 같은 시리즈 1편씩만)

반드시 아래 JSON 배열로만 응답하세요(정확히 3개):
[
  {
    "title": "영화제목",
    "year": "개봉연도",
    "genre": "장르",
    "koreanRating": "전체관람가" | "12세이상관람가" | "15세이상관람가" | "청소년관람불가",
    "reason": "왜 이 단원의 ${age}세 학생에게 좋은지 1~2문장",
    "topicConnection": "「${topic}」와 어떻게 직접 연결되는지 1~2문장 (구체적 장면·인물·메시지 인용)",
    "plotSummary": "줄거리 5~7문장"
  }
]`;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.4 },
    });

    const text = response.text || '';
    const data = cleanJson<any[]>(text);
    const arr = Array.isArray(data) ? data : [];

    // 서버 측 등급 필터 — 프롬프트가 흔들려도 비허용 등급 차단
    const filtered = filterByAge(arr, age);
    const usedFallback = filtered.length === 0 && arr.length > 0;
    // 필터 결과가 0이면 원본 그대로 노출하되 ageWarning=true 플래그 부착
    const final = (usedFallback ? arr : filtered)
      .slice(0, 3)
      .map((r: any) => ({ ...r, ageWarning: usedFallback }));

    return res.status(200).json({
      recommendations: final,
      meta: {
        targetAge: age,
        allowedRatings: allowedRatingsForAge(age),
        rejectedCount: usedFallback ? 0 : arr.length - filtered.length,
        usedFallback,
        ottVerified: !!(ott && tmdbCandidates.length > 0),
        ottName: ott?.displayName || null,
        tmdbCandidateCount: tmdbCandidates.length,
      },
    });
  } catch (error: any) {
    console.error('[Recommend Error]:', error);
    return res.status(500).json({
      error: 'Recommendation failed',
      details: error?.message || String(error),
    });
  }
}
