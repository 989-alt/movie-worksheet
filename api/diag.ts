import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 환경변수 진단 — 실제 값은 노출하지 않고 존재 여부만 보고.
 * 운영에서도 안전. 디버깅 시 /api/diag 호출.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const recognized = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    VITE_GEMINI_API_KEY: !!process.env.VITE_GEMINI_API_KEY,
    TMDB_API_KEY: !!process.env.TMDB_API_KEY,
    VITE_TMDB_API_KEY: !!process.env.VITE_TMDB_API_KEY,
  };

  const allEnvKeys = Object.keys(process.env)
    .filter((k) => /GEMINI|GOOGLE|TMDB|VITE|MOVIE|API_KEY$/i.test(k))
    .sort();

  const effective = {
    geminiAvailable: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
    tmdbAvailable: !!(process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY),
  };

  res.status(200).json({
    timestamp: new Date().toISOString(),
    region: process.env.VERCEL_REGION || 'unknown',
    deployment: process.env.VERCEL_URL || 'unknown',
    nodeVersion: process.version,
    recognized,
    effective,
    allRelevantEnvKeys: allEnvKeys,
    message: effective.geminiAvailable
      ? '✅ Gemini API 사용 가능'
      : '❌ Gemini API 키가 없음 — Vercel env vars 추가 후 Deployment 재실행 필요',
  });
}
