export enum ActivityType {
  CHARACTER_ANALYSIS = '캐릭터 분석',
  PLOT_SUMMARY = '줄거리 요약',
  DISCUSSION = '토론 활동',
  CREATIVE_WRITING = '창작 글쓰기',
}

export enum GenerationMode {
  SPECIFIC_MOVIE = 'Specific Movie',
  RECOMMENDATION = 'Recommendation',
  YOUTUBE = 'YouTube Link',
  UNIT = 'Curriculum Unit',
}

export type DesignStyle = 'modern' | 'retro' | 'playful' | 'minimal';

export interface OttProviderBadge {
  provider_id: number;
  provider_name: string;
  logo_path?: string;
}

export interface VocabularyItem {
  word: string;
  definition: string;
}

export interface MovieFormData {
  mode: GenerationMode;
  movieTitle?: string;
  ottPlatform?: string;
  topic?: string;
  targetAge: number;
  activityType: ActivityType;
  youtubeUrl?: string;
  unitKey?: string;
  backgroundColor?: string;
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
  ottProviders?: OttProviderBadge[];
  unitMeta?: {
    grade: number;
    subject: string;
    unitTitle: string;
    achievements?: string[];
  };
  // Phase E1: educational restructure fields
  vocabulary?: VocabularyItem[];
  prediction?: string;
  selfAssessment?: string[];
  oneLineReview?: string;
}

export interface LoadingState {
  isLoading: boolean;
  message: string;
}

export type BlockType =
  | 'header'
  | 'text'
  | 'blank_box'
  | 'page_break'
  | 'vocabulary_table'
  | 'self_assessment'
  | 'prediction_box'
  | 'one_liner';

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
  height?: number;
  data?: any;
  borderStyle?: 'solid' | 'dashed' | 'none';
  lined?: boolean;
  label?: string;
}
