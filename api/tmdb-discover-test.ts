import type { VercelRequest, VercelResponse } from '@vercel/node';

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;

/**
 * Diagnostic: list KR watch providers to find correct provider_ids.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!TMDB_API_KEY) return res.status(500).json({ error: 'no TMDB key' });

  const url = `https://api.themoviedb.org/3/watch/providers/movie?api_key=${TMDB_API_KEY}&watch_region=KR&language=ko-KR`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    const search = String(req.query.q || '').toLowerCase();
    let providers = (data.results || []).map((p: any) => ({
      id: p.provider_id,
      name: p.provider_name,
      priority: p.display_priorities?.KR ?? p.display_priority,
    }));
    if (search) {
      providers = providers.filter((p: any) => p.name.toLowerCase().includes(search));
    }
    providers.sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99));
    return res.status(200).json({ count: providers.length, providers });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message });
  }
}
