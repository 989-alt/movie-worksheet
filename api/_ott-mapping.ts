/**
 * 한국에서 시청 가능한 OTT 플랫폼 ↔ TMDB Watch Provider ID 매핑.
 * provider_id는 TMDB /watch/providers/movie?watch_region=KR 응답 기준 (안정적인 ID).
 * 별칭(aliases)은 사용자 입력 정규화용 — 한글/영문/공백/대소문자 차이 흡수.
 */

export interface OttMapping {
  id: number;
  displayName: string;
  aliases: string[]; // lowercase, no-space
}

export const KOREAN_OTT_LIST: OttMapping[] = [
  { id: 8,    displayName: 'Netflix',      aliases: ['netflix', '넷플릭스'] },
  { id: 337,  displayName: 'Disney+',      aliases: ['disney+', 'disneyplus', '디즈니+', '디즈니플러스'] },
  { id: 1881, displayName: 'TVING',        aliases: ['tving', '티빙'] },
  { id: 1859, displayName: '쿠팡플레이',     aliases: ['coupangplay', 'coupang', '쿠팡플레이', '쿠팡'] },
  { id: 1873, displayName: 'Wavve',        aliases: ['wavve', '웨이브'] },
  { id: 97,   displayName: 'Watcha',       aliases: ['watcha', '왓챠'] },
  { id: 350,  displayName: 'Apple TV+',    aliases: ['appletv+', 'appletvplus', 'appletv', '애플tv+', '애플tv플러스', '애플tv'] },
  { id: 119,  displayName: 'Amazon Prime', aliases: ['amazonprime', 'primevideo', 'amazon', '아마존프라임', '아마존프라임비디오'] },
];

function normalize(input: string): string {
  return input.toLowerCase().replace(/\s+/g, '').replace(/[·,/]/g, '').trim();
}

/**
 * 사용자 입력에서 OTT 매핑 찾기. 정확/부분 매치 모두 지원.
 */
export function findOttByName(input: string | undefined | null): OttMapping | null {
  if (!input) return null;
  const n = normalize(input);
  if (!n) return null;

  // 1차: 정확 일치
  for (const ott of KOREAN_OTT_LIST) {
    if (ott.aliases.some((a) => normalize(a) === n)) return ott;
  }
  // 2차: 부분 일치 (사용자 입력에 별칭이 포함되거나 그 반대)
  for (const ott of KOREAN_OTT_LIST) {
    if (ott.aliases.some((a) => {
      const an = normalize(a);
      return an.length >= 3 && (n.includes(an) || an.includes(n));
    })) return ott;
  }
  return null;
}

/**
 * targetAge에 따른 TMDB KR certification 상한.
 * KMRB 한국 등급:
 *  - All (전체관람가)
 *  - 12 (12세이상관람가)
 *  - 15 (15세이상관람가)
 *  - 19 (청소년관람불가)
 */
export function maxCertForAge(targetAge: number): string[] {
  if (targetAge >= 16) return ['All', '12', '15'];
  if (targetAge >= 13) return ['All', '12'];
  return ['All'];
}
