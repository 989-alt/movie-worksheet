export interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv' | 'person';
  release_date?: string;
  first_air_date?: string;
  overview: string;
  poster_path?: string;
}

export interface OttProvider {
  provider_id: number;
  provider_name: string;
  logo_path?: string;
}

export interface OttProviders {
  flatrate: OttProvider[];
  rent: OttProvider[];
  buy: OttProvider[];
  link: string | null;
}

// TMDB multi search (KR region) — Vercel API proxy
export const searchMulti = async (query: string): Promise<TMDBResult[]> => {
  try {
    const response = await fetch(`/api/tmdb-search?query=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('TMDB search failed:', error);
    return [];
  }
};

// TMDB watch providers (KR)
export const getProviders = async (
  id: number | string,
  mediaType: 'movie' | 'tv' = 'movie'
): Promise<OttProviders> => {
  const empty: OttProviders = { flatrate: [], rent: [], buy: [], link: null };
  try {
    const response = await fetch(
      `/api/tmdb-providers?id=${encodeURIComponent(String(id))}&mediaType=${mediaType}`
    );
    if (!response.ok) return empty;
    return await response.json();
  } catch (error) {
    console.error('TMDB providers failed:', error);
    return empty;
  }
};
