import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash';

function normalizeYouTubeUrl(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
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

  const { url, targetAge, activityType, classification } = (req.body || {}) as {
    url?: string;
    targetAge?: number;
    activityType?: string;
    classification?: {
      title?: string;
      channel?: string;
      summary?: string;
      topics?: string[];
    };
  };

  const normalized = normalizeYouTubeUrl(url || '');
  if (!normalized) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = `당신은 교육 전문가이자 영상 분석가입니다. 아래 YouTube 영상을 시청하고 ${
      targetAge || 12
    }세 학생용 학습지를 작성해주세요.

활동 유형: "${activityType || '토론 활동'}"

${
  classification?.title
    ? `[참고 메타]\n- 제목: ${classification.title}\n- 채널: ${classification.channel || ''}\n- 요약: ${
        classification.summary || ''
      }\n- 주요 주제: ${(classification.topics || []).join(', ')}`
    : ''
}

[작성 지침]
1. 영상의 시각·청각 요소를 학습지에 반영(인상적인 장면·대사 인용 권장)
2. 토론 질문은 영상의 구체적 장면이나 대사를 근거로 작성
3. 활동 내용은 ${targetAge || 12}세에게 단순하고 명확하게

[디자인 스타일] modern / retro / playful / minimal 중 적합한 1개

반드시 아래 JSON 형식으로만 응답하세요:
{
  "movieTitle": "영상 제목",
  "director": "채널명 또는 제작자",
  "releaseYear": "업로드 연도(추정 가능 시)",
  "genre": "영상 장르/카테고리",
  "ageRating": "전체관람가/12세/15세/청소년관람불가",
  "isAppropriate": true,
  "inappropriateReason": "",
  "plotSummary": "영상 내용 상세 요약 (200자 이상, 구체적 장면 포함)",
  "educationalThemes": ["주제1", "주제2", "주제3"],
  "discussionQuestions": [
    "영상에서 [구체적 장면]을 보고 어떻게 생각했나요?",
    "[등장인물/내레이터]의 [구체적 행동/말]은 무엇을 의미할까요?",
    "이 영상의 핵심 메시지는 무엇이며 일상에 어떻게 적용할 수 있을까요?"
  ],
  "activityContent": "<p>학습 활동 안내 HTML</p>",
  "themeColor": "#3b82f6",
  "designStyle": "modern",
  "videoInsights": {
    "keyScenes": ["주요 장면1", "주요 장면2"],
    "characters": ["주요 인물/내레이터1"],
    "visualElements": ["시각적 특징1", "시각적 특징2"],
    "quotableLines": ["인상적인 대사·문구1", "인상적인 대사·문구2"]
  }
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
    const data = cleanJson(text);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Generate from Video Error]:', error);
    const msg = error?.message || String(error);
    if (/private|restricted|unavailable|forbidden/i.test(msg)) {
      return res.status(400).json({
        error: 'Video not accessible',
        details: '비공개·연령제한·지역제한 영상은 분석할 수 없습니다.',
      });
    }
    return res.status(500).json({
      error: 'Worksheet from video failed',
      details: msg,
    });
  }
}
