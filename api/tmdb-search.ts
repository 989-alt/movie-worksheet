import type { VercelRequest, VercelResponse } from '@vercel/node';

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = typeof req.query.query === 'string' ? req.query.query : '';
  if (!query) return res.status(400).json({ error: 'query is required' });
  if (!TMDB_API_KEY) return res.status(200).json([]);

  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      query,
      include_adult: 'false',
      language: 'ko-KR',
      region: 'KR',
    });
    const response = await fetch(`https://api.themoviedb.org/3/search/multi?${params}`);
    if (!response.ok) throw new Error(`TMDB Error: ${response.status}`);
    const data = await response.json();
    const filtered = (data.results || []).filter((item: any) => item.media_type !== 'person');
    return res.status(200).json(filtered);
  } catch (error: any) {
    console.error('TMDB Search Error:', error);
    return res.status(200).json([]);
  }
}
