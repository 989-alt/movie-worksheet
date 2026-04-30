import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { allowedRatingsForAge, filterByAge, ratingRulesForPrompt } from './_age-rating';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash';

function cleanJson<T = any>(text: string): T {
  let s = text.trim();
  if (s.startsWith('```json')) s = s.slice(7);
  if (s.startsWith('```')) s = s.slice(3);
  if (s.endsWith('```')) s = s.slice(0, -3);
  return JSON.parse(s.trim());
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

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = `[영화 추천 요청 — 학교 수업용 학습지 자료]
대상 학생 만 나이: ${age}세
선호 OTT: ${ottPlatform || '한국에서 시청 가능한 모든 플랫폼(Netflix, Disney+, TVING, Wavve, Watcha, 쿠팡플레이 등)'}
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

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.4 },
    });

    const text = response.text || '';
    const data = cleanJson<any[]>(text);
    const arr = Array.isArray(data) ? data : [];

    // 서버 측 등급 필터 — 프롬프트가 흔들려도 비허용 등급 차단
    const filtered = filterByAge(arr, age).slice(0, 3);

    return res.status(200).json({
      recommendations: filtered,
      meta: {
        targetAge: age,
        allowedRatings: allowedRatingsForAge(age),
        rejectedCount: arr.length - filtered.length,
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
