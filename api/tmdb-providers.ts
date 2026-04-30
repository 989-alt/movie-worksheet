import type { VercelRequest, VercelResponse } from '@vercel/node';

const TMDB_API_KEY = process.env.TMDB_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  const mediaType = (typeof req.query.mediaType === 'string' ? req.query.mediaType : 'movie') as 'movie' | 'tv';

  if (!id) return res.status(400).json({ error: 'id is required' });
  if (!TMDB_API_KEY) return res.status(200).json({ flatrate: [], rent: [], buy: [], link: null });

  try {
    const url = `https://api.themoviedb.org/3/${mediaType}/${id}/watch/providers?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`TMDB Providers Error: ${response.status}`);
    const data = await response.json();
    const kr = data.results?.KR || {};

    const dedupeByName = (arr: any[] = []) => {
      const seen = new Set<string>();
      return arr.filter((p: any) => {
        if (!p?.provider_name || seen.has(p.provider_name)) return false;
        seen.add(p.provider_name);
        return true;
      }).map((p: any) => ({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        logo_path: p.logo_path,
      }));
    };

    return res.status(200).json({
      flatrate: dedupeByName(kr.flatrate),
      rent: dedupeByName(kr.rent),
      buy: dedupeByName(kr.buy),
      link: kr.link || null,
    });
  } catch (error: any) {
    console.error('TMDB Providers Error:', error);
    return res.status(200).json({ flatrate: [], rent: [], buy: [], link: null });
  }
}
