import type { WorksheetData } from '../types';

export type FitGrade =
  | 'elementary-1-2'
  | 'elementary-3-4'
  | 'elementary-5-6'
  | 'middle'
  | 'high'
  | 'inappropriate';

export interface YouTubeClassification {
  url: string;
  primaryGrade: FitGrade;
  fitGrades: FitGrade[];
  isAppropriate: boolean;
  inappropriateReason?: string;
  title: string;
  channel: string;
  summary: string;
  ageJustification: string;
  suggestedActivityType: string;
  topics: string[];
}

export const GRADE_LABELS: Record<FitGrade, string> = {
  'elementary-1-2': '초등 1~2학년',
  'elementary-3-4': '초등 3~4학년',
  'elementary-5-6': '초등 5~6학년',
  middle: '중학교',
  high: '고등학교',
  inappropriate: '학습 자료로 부적절',
};

export const GRADE_AGE_DEFAULT: Record<FitGrade, number> = {
  'elementary-1-2': 8,
  'elementary-3-4': 10,
  'elementary-5-6': 12,
  middle: 14,
  high: 17,
  inappropriate: 0,
};

// YouTube URL 검증 (클라이언트 기본 형식 체크)
export function isValidYouTubeUrl(url: string): boolean {
  if (!url) return false;
  const patterns = [
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ];
  return patterns.some((re) => re.test(url));
}

export async function classifyYouTube(url: string): Promise<YouTubeClassification> {
  const response = await fetch('/api/youtube-classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.details || err.error || '영상 분석 실패');
  }
  return (await response.json()) as YouTubeClassification;
}

export async function generateWorksheetFromVideo(args: {
  url: string;
  targetAge: number;
  activityType: string;
  classification?: Partial<YouTubeClassification>;
}): Promise<WorksheetData> {
  const response = await fetch('/api/generate-worksheet-from-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.details || err.error || '영상 학습지 생성 실패');
  }
  return (await response.json()) as WorksheetData;
}
