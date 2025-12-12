
export enum ActivityType {
  CHARACTER_ANALYSIS = 'Character Analysis',
  PLOT_SUMMARY = 'Plot Summary',
  DISCUSSION = 'Discussion',
  CREATIVE_WRITING = 'Creative Writing',
}

export enum GenerationMode {
  SPECIFIC_MOVIE = 'Specific Movie',
  RECOMMENDATION = 'Recommendation',
}

export type DesignStyle = 'modern' | 'retro' | 'playful' | 'minimal';

export interface MovieFormData {
  mode: GenerationMode;
  movieTitle?: string;
  ottPlatform?: string;
  topic?: string;
  targetAge: number;
  activityType: ActivityType;
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
  // New design fields
  themeColor: string;
  designStyle: DesignStyle;
}

export interface LoadingState {
  isLoading: boolean;
  message: string;
}

export type BlockType = 'header' | 'text' | 'blank_box' | 'page_break';

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string; // HTML content for text blocks
  height?: number; // For blank_box (pixels)
  data?: any; // For header metadata or extra info
  borderStyle?: 'solid' | 'dashed' | 'none';
}
