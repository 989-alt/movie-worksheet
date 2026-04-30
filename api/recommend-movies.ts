import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash';

function cleanJson<T = any>(text: string): T {
  let clean = text.trim();
  if (clean.startsWith('```json')) clean = clean.slice(7);
  if (clean.startsWith('```')) clean = clean.slice(3);
  if (clean.endsWith('```')) clean = clean.slice(0, -3);
  return JSON.parse(clean.trim());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  const { topic, ottPlatform, targetAge } = req.body || {};
  if (!topic) {
    return res.status(400).json({ error: 'topic is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = `[영화 추천 요청]
사용자 선호 OTT: ${ottPlatform || '한국에서 시청 가능한 모든 플랫폼(Netflix, Disney+, TVING, Wavve, Watcha, 쿠팡플레이 등)'}
관심 주제/테마: ${topic}
대상 연령: ${targetAge || 12}세

위 조건에 맞는 교육적으로 적합한 영화 정확히 3편을 추천해주세요.
- 한국에서 합법적으로 시청 가능한 영화 우선
- 해당 연령에 적합한 콘텐츠만
- 각 영화마다 줄거리(plotSummary)를 5~7문장으로 풍부하게 작성

반드시 아래 JSON 배열 형식으로만 응답하세요(정확히 3개):
[
  {"title": "영화제목", "year": "개봉연도", "genre": "장르", "reason": "추천 이유 1~2문장", "plotSummary": "줄거리 5~7문장"},
  {"title": "영화제목", "year": "개봉연도", "genre": "장르", "reason": "추천 이유 1~2문장", "plotSummary": "줄거리 5~7문장"},
  {"title": "영화제목", "year": "개봉연도", "genre": "장르", "reason": "추천 이유 1~2문장", "plotSummary": "줄거리 5~7문장"}
]`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    const text = response.text || '';
    const data = cleanJson<any[]>(text);
    const trimmed = Array.isArray(data) ? data.slice(0, 3) : [];
    return res.status(200).json(trimmed);
  } catch (error: any) {
    console.error('[Recommend Error]:', error);
    return res.status(500).json({
      error: 'Recommendation failed',
      details: error?.message || String(error),
    });
  }
}
