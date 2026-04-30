import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

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
      hint: 'Vercel Project Settings → Environment Variables 확인 후 재배포 필요. /api/diag 참조.',
    });
  }

  const {
    unitKey,
    unitTitle,
    subjectLabel,
    grade,
    semester,
    achievements = [],
    keyTopics = [],
    suggestedMovieThemes = [],
    bodySummary = '',
    targetAge,
  } = (req.body || {}) as {
    unitKey?: string;
    unitTitle?: string;
    subjectLabel?: string;
    grade?: number;
    semester?: number;
    achievements?: string[];
    keyTopics?: string[];
    suggestedMovieThemes?: string[];
    bodySummary?: string;
    targetAge?: number;
  };

  if (!unitTitle) {
    return res.status(400).json({ error: 'unitTitle is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const ageHint = targetAge || (grade ? Math.min(7 + grade, 12) : 12);
    const prompt = `당신은 한국 초등 ${grade || 6}학년 ${semester || 1}학기 ${
      subjectLabel || ''
    } 단원 「${unitTitle}」에 어울리는 영화 학습지 자료를 추천하는 교육 전문가입니다.

[단원 성취기준]
${achievements.map((a) => `- ${a}`).join('\n') || '- (없음)'}

[단원 핵심 주제]
${keyTopics.join(', ') || '(없음)'}

[교사가 추천한 영화 장르/소재]
${suggestedMovieThemes.join(', ') || '(없음)'}

[단원 본문 요약]
${bodySummary || '(없음)'}

[추천 조건]
- 만 ${ageHint}세 학생에게 적절(폭력·선정·욕설 없음, 학습용)
- 한국에서 합법적으로 시청 가능한 작품 우선 (Netflix·TVING·Wavve·Watcha·쿠팡플레이·디즈니+ 등)
- 단원 성취기준·주제와 명확하게 연결되는 작품
- 정확히 3편 — 각각 다른 영화여야 함

반드시 아래 JSON 배열로만 응답하세요(정확히 3개):
[
  {
    "title": "영화제목",
    "year": "개봉연도",
    "genre": "장르",
    "reason": "이 단원과 연결되는 핵심 이유 1~2문장",
    "plotSummary": "줄거리 5~7문장",
    "unitConnection": "단원 성취기준 중 어떤 것과 어떻게 연결되는지 1~2문장"
  }
]`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.4 },
    });

    const text = response.text || '';
    const data = cleanJson<any[]>(text);
    const trimmed = Array.isArray(data) ? data.slice(0, 3) : [];
    return res.status(200).json({ unitKey, recommendations: trimmed });
  } catch (error: any) {
    console.error('[Recommend By Unit Error]:', error);
    return res.status(500).json({
      error: 'Recommend-by-unit failed',
      details: error?.message || String(error),
    });
  }
}
