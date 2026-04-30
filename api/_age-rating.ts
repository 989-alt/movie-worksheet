/**
 * 한국 영상물등급위원회(KMRB) 등급 ↔ 만 나이 매핑.
 * 학교 수업용 자료는 보수적으로 적용 — 만 나이가 등급 기준선과 같으면 권장하지 않음.
 */

export type KmrbRating = '전체관람가' | '12세이상관람가' | '15세이상관람가' | '청소년관람불가';

const RATING_MIN_AGE: Record<KmrbRating, number> = {
  전체관람가: 0,
  '12세이상관람가': 12,
  '15세이상관람가': 15,
  청소년관람불가: 19,
};

/**
 * targetAge에서 허용되는 한국 등급 목록.
 * 정책: 학교 수업용은 등급 기준선보다 만 나이가 1세 이상 높아야 안전한 것으로 간주.
 *  - 11세 → 전체관람가만
 *  - 12세 → 전체관람가 (12세이상은 보수적으로 제외, 교사 재량으로 추가 가능하지만 자동 추천에서는 제외)
 *  - 13세 → 전체관람가 + 12세이상관람가
 *  - 15세 → 전체관람가 + 12세이상관람가
 *  - 16세 → 전체관람가 + 12세이상관람가 + 15세이상관람가
 *  - 청소년관람불가는 어떤 학교 수업에서도 추천하지 않음
 */
export function allowedRatingsForAge(targetAge: number): KmrbRating[] {
  const allowed: KmrbRating[] = ['전체관람가'];
  if (targetAge >= 13) allowed.push('12세이상관람가');
  if (targetAge >= 16) allowed.push('15세이상관람가');
  return allowed;
}

/**
 * 응답 등급 문자열을 표준화 (다양한 표기 허용 — "12세", "12+", "PG-12" 등을 흡수).
 */
export function normalizeRating(input: string | undefined | null): KmrbRating | null {
  if (!input) return null;
  const s = String(input).replace(/\s/g, '').toLowerCase();
  if (s.includes('전체') || s === 'g' || s === 'all' || s === '전체관람가') return '전체관람가';
  if (s.includes('12') && (s.includes('이상') || s.includes('+') || s.includes('관람가') || s === '12'))
    return '12세이상관람가';
  if (s.includes('15') && (s.includes('이상') || s.includes('+') || s.includes('관람가') || s === '15'))
    return '15세이상관람가';
  if (s.includes('19') || s.includes('청소년관람불가') || s.includes('청불') || s === 'r' || s.includes('r-rated'))
    return '청소년관람불가';
  return null;
}

/**
 * 추천 객체 배열에서 허용 등급만 통과시킨다.
 * - koreanRating 필드가 없거나 정규화 실패한 항목은 거부 (안전 우선)
 */
export function filterByAge<T extends { koreanRating?: string }>(
  items: T[],
  targetAge: number
): T[] {
  const allowed = new Set(allowedRatingsForAge(targetAge));
  return items.filter((it) => {
    const r = normalizeRating(it.koreanRating);
    return r != null && allowed.has(r);
  });
}

/**
 * 프롬프트에 삽입할 등급 규칙 텍스트.
 */
export function ratingRulesForPrompt(targetAge: number): string {
  const allowed = allowedRatingsForAge(targetAge);
  return `[★시청연령 엄격 준수★]
대상 학생 만 나이: ${targetAge}세 (학교 수업용)
허용 한국 영상물등급위원회(KMRB) 등급(아래만 가능 — 다른 등급은 절대 추천 금지):
${allowed.map((r) => `  - ${r}`).join('\n')}

⚠️ 다음은 절대 추천 금지:
${(['전체관람가', '12세이상관람가', '15세이상관람가', '청소년관람불가'] as KmrbRating[])
  .filter((r) => !allowed.includes(r))
  .map((r) => `  - ${r}`)
  .join('\n')}

⚠️ 등급을 모르거나 불확실한 경우 추천하지 마세요. 확실한 영화만 제시하세요.
⚠️ 응답의 koreanRating 필드는 반드시 위 4가지 중 하나의 정확한 한국어 표기여야 합니다.`;
}
