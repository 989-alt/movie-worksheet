import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 운영자 Gemini 키 요금 보호용 사용량 제한.
 * - IP당 1시간에 PER_IP_LIMIT회, 함수 인스턴스 전체로 1시간에 GLOBAL_LIMIT회.
 * - 메모리 기반이라 인스턴스마다 따로 센다(완전한 제한은 아님). 확실한 상한은
 *   Google Cloud 콘솔에서 Gemini API 할당량(분당·일일 요청 수)을 함께 걸어 둔다.
 */
const WINDOW_MS = 60 * 60 * 1000;
const PER_IP_LIMIT = 20;
const GLOBAL_LIMIT = 200;

type Bucket = { count: number; resetAt: number };
const perIp = new Map<string, Bucket>();
let global: Bucket = { count: 0, resetAt: Date.now() + WINDOW_MS };

function clientIp(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  const first = Array.isArray(xff) ? xff[0] : xff;
  if (first) return first.split(',')[0].trim();
  const real = req.headers['x-real-ip'];
  return (Array.isArray(real) ? real[0] : real) || 'unknown';
}

function hit(bucket: Bucket | undefined, limit: number, now: number): { bucket: Bucket; ok: boolean } {
  const b = !bucket || now > bucket.resetAt ? { count: 0, resetAt: now + WINDOW_MS } : bucket;
  if (b.count >= limit) return { bucket: b, ok: false };
  b.count += 1;
  return { bucket: b, ok: true };
}

/** 제한을 넘으면 429를 보내고 false를 돌려준다. */
export function allowAiCall(req: VercelRequest, res: VercelResponse): boolean {
  const now = Date.now();
  if (perIp.size > 5000) for (const [k, v] of perIp) if (now > v.resetAt) perIp.delete(k);

  const g = hit(global, GLOBAL_LIMIT, now);
  global = g.bucket;
  const ip = clientIp(req);
  const r = hit(perIp.get(ip), PER_IP_LIMIT, now);
  perIp.set(ip, r.bucket);

  if (g.ok && r.ok) return true;
  const retry = Math.ceil(((r.ok ? g.bucket : r.bucket).resetAt - now) / 1000);
  res.setHeader('Retry-After', String(retry));
  res.status(429).json({ error: `요청이 너무 많습니다. ${Math.ceil(retry / 60)}분 뒤 다시 시도해 주세요.` });
  return false;
}
