/**
 * 빌드 시 생성된 curriculum 메타 인덱스를 정적으로 import한다.
 * data/curriculum/index.json은 scripts/build-curriculum-index.ts가 생성.
 */
import indexJson from '../../data/curriculum/index.json';

export interface UnitMeta {
  unitKey: string;
  grade: number;
  semester: number;
  subject: string;
  subjectLabel: string;
  publisher?: string;
  unitNumber: number;
  unitTitle: string;
  pageStart?: number;
  pageEnd?: number;
  suggestedActivityType: string;
  achievements: string[];
  keyTopics: string[];
  suggestedMovieThemes: string[];
  filename: string;
  bodySummary?: string;
}

export const ALL_UNITS: UnitMeta[] = (indexJson as any[]) || [];

export function getUnit(unitKey: string): UnitMeta | undefined {
  return ALL_UNITS.find((u) => u.unitKey === unitKey);
}

export function listGrades(): number[] {
  return Array.from(new Set(ALL_UNITS.map((u) => u.grade))).sort((a, b) => a - b);
}

export function listSubjects(grade: number, semester?: number): string[] {
  return Array.from(
    new Set(
      ALL_UNITS.filter((u) => u.grade === grade && (semester == null || u.semester === semester)).map(
        (u) => u.subject
      )
    )
  );
}

export function listUnitsBy(filter: {
  grade?: number;
  semester?: number;
  subject?: string;
}): UnitMeta[] {
  return ALL_UNITS.filter(
    (u) =>
      (filter.grade == null || u.grade === filter.grade) &&
      (filter.semester == null || u.semester === filter.semester) &&
      (filter.subject == null || u.subject === filter.subject)
  );
}
