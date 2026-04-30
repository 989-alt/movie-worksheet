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

  // grade(학년) 기반 보수적 만 나이 — targetAge가 명시되면 우선
  const ageFromGrade = grade ? Math.min(7 + grade, 12) : 12;
  const age = Number(targetAge) || ageFromGrade;

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = `[교과서 단원 기반 영화 추천 — 학교 수업용 학습지 자료]
대상 학생 만 나이: ${age}세 (한국 ${grade || 6}학년 ${semester || 1}학기 ${subjectLabel || ''})
단원: 「${unitTitle}」

[단원 성취기준]
${achievements.map((a) => `- ${a}`).join('\n') || '- (없음)'}

[단원 핵심 주제]
${keyTopics.join(', ') || '(없음)'}

[교사가 추천한 영화 장르/소재]
${suggestedMovieThemes.join(', ') || '(없음)'}

[단원 본문 요약]
${bodySummary || '(없음)'}

${ratingRulesForPrompt(age)}

[★단원 연관성 엄수★]
각 추천 영화는 단원 「${unitTitle}」의 성취기준·핵심 주제와 직접 연결되어야 합니다.
- 단순히 단원과 비슷한 시대/배경이 아니라, 영화의 줄거리·메시지·인물이 단원 학습 목표를 직접 보강해야 함
- 분위기·연관 추측 금지. 확신이 들지 않으면 추천하지 마세요.
- unitConnection 필드에 어떤 성취기준과 어떻게 연결되는지 구체적으로.

[추천 조건]
- 한국에서 합법적으로 시청 가능한 영화·드라마 우선
- 정확히 3편 (서로 다른 작품)

반드시 아래 JSON 배열로만 응답하세요(정확히 3개):
[
  {
    "title": "영화제목",
    "year": "개봉연도",
    "genre": "장르",
    "koreanRating": "전체관람가" | "12세이상관람가" | "15세이상관람가" | "청소년관람불가",
    "reason": "이 단원의 ${age}세 학생에게 좋은 핵심 이유 1~2문장",
    "unitConnection": "단원 성취기준 중 어떤 것과 어떻게 연결되는지 구체적으로 1~2문장",
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

    const filtered = filterByAge(arr, age);
    const usedFallback = filtered.length === 0 && arr.length > 0;
    const final = (usedFallback ? arr : filtered)
      .slice(0, 3)
      .map((r: any) => ({ ...r, ageWarning: usedFallback }));

    return res.status(200).json({
      unitKey,
      recommendations: final,
      meta: {
        targetAge: age,
        allowedRatings: allowedRatingsForAge(age),
        rejectedCount: usedFallback ? 0 : arr.length - filtered.length,
        usedFallback,
      },
    });
  } catch (error: any) {
    console.error('[Recommend By Unit Error]:', error);
    return res.status(500).json({
      error: 'Recommend-by-unit failed',
      details: error?.message || String(error),
    });
  }
}
