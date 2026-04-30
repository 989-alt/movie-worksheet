import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash';

// 학년대 5단계 + 부적절
type FitGrade =
  | 'elementary-1-2'
  | 'elementary-3-4'
  | 'elementary-5-6'
  | 'middle'
  | 'high'
  | 'inappropriate';

const VALID_GRADES: FitGrade[] = [
  'elementary-1-2',
  'elementary-3-4',
  'elementary-5-6',
  'middle',
  'high',
  'inappropriate',
];

// YouTube URL 정규화 (다양한 형식 → watch?v= 표준)
function normalizeYouTubeUrl(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  // youtu.be/ID, youtube.com/watch?v=ID, youtube.com/shorts/ID, youtube.com/embed/ID
  const patterns = [
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m && m[1]) return `https://www.youtube.com/watch?v=${m[1]}`;
  }
  return null;
}

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
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured',
      hint: 'Vercel Project Settings → Environment Variables 확인. /api/diag 참조.',
    });
  }

  const { url } = (req.body || {}) as { url?: string };
  const normalized = normalizeYouTubeUrl(url || '');
  if (!normalized) {
    return res.status(400).json({
      error: 'Invalid URL',
      details: '유효한 YouTube 링크를 입력해주세요.',
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = `아래 YouTube 영상을 시청한 뒤, 한국 초·중·고등학생 수업용 자료로 사용하기에 어느 학년대에 적합한지 평가해주세요.

[학년대 정의]
- elementary-1-2: 초등 1~2학년 (만 7~8세)
- elementary-3-4: 초등 3~4학년 (만 9~10세)
- elementary-5-6: 초등 5~6학년 (만 11~12세)
- middle: 중학교 1~3학년 (만 13~15세)
- high: 고등학교 1~3학년 (만 16~18세)
- inappropriate: 학습 자료로 부적절 (폭력·선정·욕설·약물·정치선동·증오발언·광고성 등)

[평가 기준]
1. 어휘 난이도와 문장 길이
2. 시각적 요소(폭력성, 선정성, 자극적 장면)
3. 주제의 추상도와 인지 부하
4. 정확성·교육적 가치
5. 한국 교육과정 연계 가능성

[활동 유형 추천] 다음 중 가장 적합한 1개:
- 캐릭터 분석 / 줄거리 요약 / 토론 활동 / 창작 글쓰기

반드시 아래 JSON 형식으로만 응답하세요:
{
  "primaryGrade": "elementary-3-4",
  "fitGrades": ["elementary-3-4", "elementary-5-6"],
  "isAppropriate": true,
  "inappropriateReason": "",
  "title": "영상 제목",
  "channel": "채널명",
  "summary": "영상 내용 3~5문장 요약",
  "ageJustification": "이 학년대에 적합하다고 판단한 이유 1~2문장",
  "suggestedActivityType": "토론 활동",
  "topics": ["주요 학습 주제1", "주요 학습 주제2"]
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: 'user',
          parts: [
            { fileData: { fileUri: normalized, mimeType: 'video/*' } },
            { text: prompt },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    });

    const text = response.text || '';
    const data = cleanJson<any>(text);

    // 정규화: primaryGrade가 유효한 값인지 검증
    const grade: FitGrade = VALID_GRADES.includes(data.primaryGrade)
      ? data.primaryGrade
      : 'inappropriate';

    return res.status(200).json({
      url: normalized,
      primaryGrade: grade,
      fitGrades: Array.isArray(data.fitGrades)
        ? data.fitGrades.filter((g: any) => VALID_GRADES.includes(g))
        : [grade],
      isAppropriate: grade !== 'inappropriate' && data.isAppropriate !== false,
      inappropriateReason: data.inappropriateReason || '',
      title: data.title || '',
      channel: data.channel || '',
      summary: data.summary || '',
      ageJustification: data.ageJustification || '',
      suggestedActivityType: data.suggestedActivityType || '토론 활동',
      topics: Array.isArray(data.topics) ? data.topics : [],
    });
  } catch (error: any) {
    console.error('[YouTube Classify Error]:', error);
    const msg = error?.message || String(error);
    // Gemini 영상 접근 실패 패턴 캡처
    if (/private|restricted|unavailable|forbidden/i.test(msg)) {
      return res.status(400).json({
        error: 'Video not accessible',
        details: '비공개·연령제한·지역제한 영상은 분석할 수 없습니다.',
      });
    }
    return res.status(500).json({
      error: 'YouTube classify failed',
      details: msg,
    });
  }
}
