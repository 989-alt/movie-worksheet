import { searchMulti, getProviders, OttProviders, OttProvider } from './tmdb';

export interface MovieOttInfo {
  tmdbId: number | null;
  mediaType: 'movie' | 'tv' | null;
  providers: OttProviders;
  posterPath?: string;
}

const EMPTY: OttProviders = { flatrate: [], rent: [], buy: [], link: null };

/**
 * Resolve a movie/TV title to TMDB ID + KR watch providers.
 * - First, multi search by title.
 * - Pick best match preferring movie media_type when both exist with same title.
 * - Fetch /watch/providers for KR.
 */
export async function resolveOttForTitle(title: string): Promise<MovieOttInfo> {
  if (!title || title.trim().length === 0) {
    return { tmdbId: null, mediaType: null, providers: EMPTY };
  }

  const results = await searchMulti(title.trim());
  if (results.length === 0) {
    return { tmdbId: null, mediaType: null, providers: EMPTY };
  }

  // Prefer movie over tv when titles match
  const sorted = [...results].sort((a, b) => {
    const am = a.media_type === 'movie' ? 0 : 1;
    const bm = b.media_type === 'movie' ? 0 : 1;
    return am - bm;
  });

  const top = sorted[0];
  if (!top || top.media_type === 'person') {
    return { tmdbId: null, mediaType: null, providers: EMPTY };
  }

  const providers = await getProviders(top.id, top.media_type);
  return {
    tmdbId: top.id,
    mediaType: top.media_type,
    providers,
    posterPath: top.poster_path,
  };
}

export function summarizeProviders(p: OttProviders): string {
  const names = (p.flatrate || []).map((x: OttProvider) => x.provider_name);
  if (names.length === 0) return '';
  return names.slice(0, 4).join(' · ');
}
