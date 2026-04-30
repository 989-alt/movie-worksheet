/**
 * data/curriculum/*.md → data/curriculum/index.json
 *
 * MD 파일 frontmatter만 파싱해 메타 인덱스를 만든다.
 * 빌드 시 실행되어 클라이언트가 import할 수 있게 한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CURRICULUM_DIR = path.join(PROJECT_ROOT, 'data', 'curriculum');
const INDEX_PATH = path.join(CURRICULUM_DIR, 'index.json');

interface UnitMeta {
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
  // 본문은 prompt context로 직접 사용 — index에 포함시킨다
  bodySummary: string;
}

// 매우 간단한 frontmatter 파서 (YAML 부분 일부 지원)
function parseFrontmatter(content: string): Record<string, any> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const lines = match[1].split(/\r?\n/);
  const out: Record<string, any> = {};
  let currentArrayKey: string | null = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      currentArrayKey = null;
      continue;
    }
    // array item
    if (line.startsWith('  - ')) {
      const val = stripQuotes(line.slice(4).trim());
      if (currentArrayKey) {
        out[currentArrayKey] = out[currentArrayKey] || [];
        out[currentArrayKey].push(val);
      }
      continue;
    }
    // key: value or key:
    const m = line.match(/^([A-Za-z_][\w]*)\s*:\s*(.*)$/);
    if (m) {
      const key = m[1];
      const value = m[2];
      if (value === '') {
        currentArrayKey = key;
        out[key] = [];
      } else {
        currentArrayKey = null;
        const v = stripQuotes(value);
        if (/^-?\d+(\.\d+)?$/.test(v)) {
          out[key] = Number(v);
        } else {
          out[key] = v;
        }
      }
    }
  }
  return out;
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

function main() {
  if (!fs.existsSync(CURRICULUM_DIR)) {
    fs.mkdirSync(CURRICULUM_DIR, { recursive: true });
  }
  const files = fs
    .readdirSync(CURRICULUM_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();

  const units: UnitMeta[] = [];
  for (const f of files) {
    const full = path.join(CURRICULUM_DIR, f);
    const content = fs.readFileSync(full, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm || !fm.unitKey) {
      console.warn(`⚠️  frontmatter 없음 또는 unitKey 누락: ${f}`);
      continue;
    }
    // ## 단원 요약 섹션 본문 추출
    const bodyMatch = content.match(/##\s*단원\s*요약\s*\n([\s\S]*?)(?=\n##\s|$)/);
    const bodySummary = bodyMatch ? bodyMatch[1].trim() : '';

    units.push({
      unitKey: String(fm.unitKey),
      grade: Number(fm.grade),
      semester: Number(fm.semester),
      subject: String(fm.subject),
      subjectLabel: String(fm.subjectLabel || fm.subject),
      publisher: fm.publisher ? String(fm.publisher) : undefined,
      unitNumber: Number(fm.unitNumber),
      unitTitle: String(fm.unitTitle),
      pageStart: fm.pageStart != null ? Number(fm.pageStart) : undefined,
      pageEnd: fm.pageEnd != null ? Number(fm.pageEnd) : undefined,
      suggestedActivityType: String(fm.suggestedActivityType || '토론 활동'),
      achievements: Array.isArray(fm.achievements) ? fm.achievements : [],
      keyTopics: Array.isArray(fm.keyTopics) ? fm.keyTopics : [],
      suggestedMovieThemes: Array.isArray(fm.suggestedMovieThemes)
        ? fm.suggestedMovieThemes
        : [],
      filename: f,
      bodySummary,
    });
  }

  units.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    if (a.semester !== b.semester) return a.semester - b.semester;
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
    return a.unitNumber - b.unitNumber;
  });

  fs.writeFileSync(INDEX_PATH, JSON.stringify(units, null, 2), 'utf8');
  console.log(`✅ ${units.length}개 단원 → ${path.relative(PROJECT_ROOT, INDEX_PATH)}`);
}

main();
