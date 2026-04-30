export enum ActivityType {
  CHARACTER_ANALYSIS = '캐릭터 분석',
  PLOT_SUMMARY = '줄거리 요약',
  DISCUSSION = '토론 활동',
  CREATIVE_WRITING = '창작 글쓰기',
}

export enum GenerationMode {
  SPECIFIC_MOVIE = 'Specific Movie',
  RECOMMENDATION = 'Recommendation',
  YOUTUBE = 'YouTube Link', // Phase C에서 활성화
  UNIT = 'Curriculum Unit', // Phase B에서 활성화
}

export type DesignStyle = 'modern' | 'retro' | 'playful' | 'minimal';

export interface OttProviderBadge {
  provider_id: number;
  provider_name: string;
  logo_path?: string;
}

export interface MovieFormData {
  mode: GenerationMode;
  movieTitle?: string;
  ottPlatform?: string;
  topic?: string;
  targetAge: number;
  activityType: ActivityType;
  // Phase C
  youtubeUrl?: string;
  // Phase B
  unitKey?: string; // e.g. "5-2-social-3"
  // 학습지 배경색
  backgroundColor?: string;
  // 추천 카드에서 자동 채움
  plotSummary?: string;
}

export interface WorksheetData {
  movieTitle: string;
  director: string;
  releaseYear: string;
  genre: string;
  ageRating: string;
  isAppropriate: boolean;
  inappropriateReason?: string;
  plotSummary: string;
  educationalThemes: string[];
  discussionQuestions: string[];
  activityContent: string;
  themeColor: string;
  designStyle: DesignStyle;
  backgroundColor?: string;
  // Phase A4
  ottProviders?: OttProviderBadge[];
  // Phase B (단원 메타)
  unitMeta?: {
    grade: number;
    subject: string;
    unitTitle: string;
    achievements?: string[];
  };
}

export interface LoadingState {
  isLoading: boolean;
  message: string;
}

export type BlockType = 'header' | 'text' | 'blank_box' | 'page_break';

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
  height?: number;
  data?: any;
  borderStyle?: 'solid' | 'dashed' | 'none';
}
