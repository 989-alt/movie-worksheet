import type { VercelRequest, VercelResponse } from '@vercel/node';

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;

/**
 * Diagnostic endpoint: test TMDB Discover with a provider_id.
 * Usage: /api/tmdb-discover-test?providerId=1881
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!TMDB_API_KEY) return res.status(500).json({ error: 'no TMDB key' });

  const providerId = String(req.query.providerId || '8');

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    with_watch_providers: providerId,
    watch_region: 'KR',
    sort_by: 'popularity.desc',
    include_adult: 'false',
    include_video: 'false',
    language: 'ko-KR',
    'vote_count.gte': '20',
    page: '1',
  });

  try {
    const url = `https://api.themoviedb.org/3/discover/movie?${params}`;
    const r = await fetch(url);
    const status = r.status;
    let body: any = null;
    try { body = await r.json(); } catch {}
    return res.status(200).json({
      url: url.replace(TMDB_API_KEY, '***'),
      status,
      total_results: body?.total_results,
      result_count: Array.isArray(body?.results) ? body.results.length : null,
      first3: (body?.results || []).slice(0, 3).map((m: any) => ({
        id: m.id,
        title: m.title,
        date: m.release_date,
      })),
      errorMessage: body?.status_message,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message });
  }
}
