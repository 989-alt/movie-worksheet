import type { UnitMeta } from '../data/curriculumIndex';
import { resolveOttForTitle } from './ottService';
import type { OttProvider } from './tmdb';

export interface UnitMovieRecommendation {
  title: string;
  year?: string;
  genre?: string;
  reason: string;
  plotSummary: string;
  unitConnection?: string;
  ottProviders?: OttProvider[];
}

interface ApiResponse {
  unitKey: string;
  recommendations: UnitMovieRecommendation[];
}

export async function recommendByUnit(
  unit: UnitMeta,
  targetAge?: number
): Promise<UnitMovieRecommendation[]> {
  const response = await fetch('/api/recommend-by-unit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      unitKey: unit.unitKey,
      unitTitle: unit.unitTitle,
      subjectLabel: unit.subjectLabel,
      grade: unit.grade,
      semester: unit.semester,
      achievements: unit.achievements,
      keyTopics: unit.keyTopics,
      suggestedMovieThemes: unit.suggestedMovieThemes,
      bodySummary: unit.bodySummary,
      targetAge,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.details || err.error || '단원별 추천 실패');
  }
  const data = (await response.json()) as ApiResponse;
  const recs = data.recommendations || [];

  // OTT 가용성 비동기 보강 (병렬)
  const enriched = await Promise.all(
    recs.map(async (r) => {
      try {
        const ott = await resolveOttForTitle(r.title);
        return { ...r, ottProviders: ott.providers.flatrate };
      } catch {
        return r;
      }
    })
  );
  return enriched;
}
