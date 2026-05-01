import { MovieFormData, WorksheetData } from '../types';

export type KmrbRating =
  | '전체관람가'
  | '12세이상관람가'
  | '15세이상관람가'
  | '청소년관람불가';

export interface MovieRecommendation {
  title: string;
  year?: string;
  genre?: string;
  koreanRating: KmrbRating;
  reason: string;
  topicConnection?: string;
  plotSummary: string;
  ageWarning?: boolean; // true면 시청연령 주의 표시
}

export interface RecommendResponse {
  recommendations: MovieRecommendation[];
  meta?: {
    targetAge: number;
    allowedRatings: KmrbRating[];
    rejectedCount: number;
    usedFallback?: boolean;
    ottVerified?: boolean;
    ottName?: string | null;
    tmdbCandidateCount?: number;
  };
}

export interface GenerateRequest {
  movieTitle?: string;
  targetAge: number;
  activityType: string;
  mode: string;
  topic?: string;
  ottPlatform?: string;
  plotSummary?: string;
  unitContext?: string;
}

export const generateWorksheet = async (
  payload: GenerateRequest | MovieFormData
): Promise<WorksheetData> => {
  try {
    const response = await fetch('/api/generate-worksheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || '학습지 생성 실패');
    }

    return (await response.json()) as WorksheetData;
  } catch (error: any) {
    console.error('[Generate Error]:', error);
    if (error.message?.includes('API') || error.message?.includes('configured')) {
      throw new Error('GEMINI_API_KEY가 Vercel 프로젝트 설정에 없습니다.');
    }
    if (error.name === 'TypeError') {
      throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
    throw new Error(error.message || '학습지 생성에 실패했습니다.');
  }
};

export const recommendMovies = async (
  topic: string,
  ottPlatform?: string,
  targetAge?: number
): Promise<RecommendResponse> => {
  try {
    const response = await fetch('/api/recommend-movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, ottPlatform, targetAge }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || '추천 실패');
    }

    return (await response.json()) as RecommendResponse;
  } catch (error: any) {
    console.error('[Recommend Error]:', error);
    return { recommendations: [] };
  }
};
