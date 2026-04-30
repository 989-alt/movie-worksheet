import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
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
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured',
      hint: 'Vercel Project Settings → Environment Variables에 GEMINI_API_KEY (또는 VITE_GEMINI_API_KEY) 추가 후 재배포 필요.',
    });
  }

  const {
    movieTitle,
    targetAge,
    activityType,
    mode,
    topic,
    ottPlatform,
    plotSummary,
    unitContext,
  } = req.body || {};

  const age = targetAge || 12;
  const vocabCount = age <= 12 ? 6 : 5;
  const questionDepth = age <= 12 ? '쉽고 구체적인' : '심층적이고 비판적인';

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const systemPrompt = `당신은 교육 전문가이자 영화 분석가입니다.
학생 나이 ${age}세에 맞는 영화 학습지를 작성해주세요.
활동 유형: "${activityType}"

[연령 적합성 평가]
- 폭력성, 선정성, 욕설, 약물 등을 고려하여 해당 연령에 적합한지 평가하세요.
- 청소년관람불가 영화는 17세 미만에게 부적합으로 표시하세요.

[디자인 스타일 선택 기준]
- modern: SF, 액션, 스릴러
- retro: 역사, 클래식, 드라마
- playful: 애니메이션, 코미디, 가족
- minimal: 다큐멘터리, 시리어스 드라마

[어휘 추출 기준]
- 영화에서 학생이 알아야 할 중요 단어 ${vocabCount}개 추출
- ${age <= 12 ? '초등학생 수준: 기본 한자어, 사회·과학 관련 용어 포함' : '중학생 수준: 심화 개념어, 비유적 표현 포함'}
- definition은 교사용 정답지에 사용되므로 정확하고 상세하게 작성

[토론 질문 기준]
- ${questionDepth} 질문 4개
- 영화의 구체적인 장면/대사를 근거로 작성

${unitContext ? `[교과서 단원 컨텍스트 — 학습지가 이 단원의 성취기준과 연계되어야 합니다]\n${unitContext}\n` : ''}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "movieTitle": "영화 제목",
  "director": "감독 이름",
  "releaseYear": "개봉년도",
  "genre": "장르",
  "ageRating": "연령등급",
  "isAppropriate": true,
  "inappropriateReason": "",
  "plotSummary": "줄거리 요약 (200자 이상)",
  "educationalThemes": ["교육적 주제1", "교육적 주제2", "교육적 주제3"],
  "discussionQuestions": ["토론 질문1", "토론 질문2", "토론 질문3", "토론 질문4"],
  "activityContent": "<p>활동 내용 HTML — 심화 활동을 ① 모둠 구성 ② 토론 ③ 발표 같은 간결한 스텝으로 작성</p>",
  "themeColor": "#hex색상코드",
  "designStyle": "modern/retro/playful/minimal 중 하나",
  "vocabulary": [
    { "word": "어휘1", "definition": "정의 및 설명1" }
  ],
  "prediction": "제목과 영화 정보를 보고 시청 전에 어떤 내용일지 예측해보세요.",
  "selfAssessment": [
    "이 영화의 핵심 메시지를 이해했나요?",
    "교과서 내용과 영화의 주제를 연결할 수 있나요?",
    "영화에서 배운 내용을 나의 일상에 어떻게 적용할 수 있나요?"
  ],
  "oneLineReview": "이 영화를 한 문장으로 표현한다면?"
}`;

    let userPrompt: string;
    if (mode === 'Specific Movie' || movieTitle) {
      userPrompt = `분석할 영화: "${movieTitle}"`;
      if (plotSummary) userPrompt += `\n\n[줄거리 참고]\n${plotSummary}`;
    } else {
      userPrompt = `${ottPlatform || 'OTT 플랫폼'}에서 볼 수 있는, "${topic}" 주제와 관련된 교육적 가치가 높은 영화를 추천하고 분석해주세요.`;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }, { text: userPrompt }] },
      ],
      config: { responseMimeType: 'application/json' },
    });

    const text = response.text || '';
    const data = cleanJson(text);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Generate Error]:', error);
    return res.status(500).json({
      error: 'Worksheet generation failed',
      details: error?.message || String(error),
    });
  }
}
