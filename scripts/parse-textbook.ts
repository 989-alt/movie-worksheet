/**
 * 교과서 PDF → 단원별 MD 변환 스크립트 (개발자 일회성)
 *
 * 동작 흐름:
 *   1. pdfjs-dist로 PDF 페이지별 텍스트 추출
 *   2. 모든 텍스트를 Gemini 2.5 Pro에 한 번에 전송
 *   3. 단원 구조(JSON 배열) 응답 → MD 파일로 저장
 *
 * 사용법:
 *   GEMINI_API_KEY=... npx tsx scripts/parse-textbook.ts
 *   --only=social|korean-a|korean-b  특정 교과만
 *   --force                           기존 산출물 덮어쓰기
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(PROJECT_ROOT, 'data', 'curriculum');

function loadDotenvLocal() {
  const candidates = [
    path.resolve(PROJECT_ROOT, '.env.local'),
    path.resolve(PROJECT_ROOT, '.env'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
loadDotenvLocal();

const FORCE = process.argv.includes('--force');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];

interface InputSpec {
  pdfPath: string;
  grade: number;
  semester: number;
  subject: string;
  subjectLabel: string;
  publisher?: string;
}

const INPUTS: InputSpec[] = [
  {
    pdfPath: 'C:/Users/hit/Downloads/교과서/society_6-1-1.pdf',
    grade: 6,
    semester: 1,
    subject: 'social',
    subjectLabel: '사회',
    publisher: '교육부',
  },
  {
    pdfPath: 'C:/Users/hit/Downloads/교과서/[사회]6-2_1_교과서.pdf',
    grade: 6,
    semester: 2,
    subject: 'social',
    subjectLabel: '사회',
    publisher: '교육부',
  },
  {
    pdfPath: 'C:/Users/hit/Downloads/교과서/국어_6-1(가)_교과서.pdf',
    grade: 6,
    semester: 1,
    subject: 'korean-a',
    subjectLabel: '국어 (가)',
    publisher: '교육부',
  },
  {
    pdfPath: 'C:/Users/hit/Downloads/교과서/국어_6-1(나)_교과서.pdf',
    grade: 6,
    semester: 1,
    subject: 'korean-b',
    subjectLabel: '국어 (나)',
    publisher: '교육부',
  },
];

interface UnitOutput {
  unitNumber: number;
  unitTitle: string;
  pageStart?: number;
  pageEnd?: number;
  achievements: string[];
  coreConcepts: string[];
  keyTopics: string[];
  suggestedMovieThemes: string[];
  suggestedActivityType: '캐릭터 분석' | '줄거리 요약' | '토론 활동' | '창작 글쓰기';
  bodySummary: string;
}

const SYSTEM_PROMPT = `당신은 한국 초등학교 6학년 교과서 분석 전문가입니다. 첨부된 교과서 본문 텍스트를 분석하여 단원(대단원) 단위로 구조화된 데이터를 추출하세요.

[추출 규칙]
1. 표지·차례·부록·해답·정답·찾아보기 등은 단원에 포함하지 마세요.
2. "단원" 또는 대표 학습 주제로 묶인 챕터 단위로 unitNumber를 1부터 매기세요.
3. 각 단원에 대해 아래 필드를 정확히 채우세요.
4. achievements는 학생이 학습 후 할 수 있어야 하는 성취기준 3~5개.
5. coreConcepts는 단원에서 다루는 핵심 개념·용어 5~8개.
6. keyTopics는 영화로 연결될 수 있는 주제어 3~5개 (예: "민주주의", "삼국통일").
7. suggestedMovieThemes는 이 단원과 어울리는 영화 장르·소재 3~5개 (예: "역사 드라마", "정치 풍자", "법정극").
8. suggestedActivityType은 한 가지만: 캐릭터 분석 / 줄거리 요약 / 토론 활동 / 창작 글쓰기
9. bodySummary는 단원 본문을 1500~3000자로 충실히 요약. 학습할 사실·사건·핵심 어휘 포함.

반드시 아래 JSON 배열로만 응답하세요(다른 텍스트 금지):
[
  {
    "unitNumber": 1,
    "unitTitle": "단원 제목",
    "pageStart": 12,
    "pageEnd": 45,
    "achievements": ["...", "..."],
    "coreConcepts": ["...", "..."],
    "keyTopics": ["...", "..."],
    "suggestedMovieThemes": ["...", "..."],
    "suggestedActivityType": "토론 활동",
    "bodySummary": "..."
  }
]`;

function cleanJson<T = any>(text: string): T {
  let s = text.trim();
  if (s.startsWith('```json')) s = s.slice(7);
  if (s.startsWith('```')) s = s.slice(3);
  if (s.endsWith('```')) s = s.slice(0, -3);
  return JSON.parse(s.trim());
}

async function extractPdfText(pdfPath: string): Promise<string> {
  // pdfjs-dist legacy build (Node 호환)
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjs.getDocument({ data, disableFontFace: true, useSystemFonts: false });
  const doc = await loadingTask.promise;
  const numPages: number = doc.numPages;
  const pages: string[] = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items: any[] = content.items as any[];
    // 라인 분리 — y 좌표 변할 때마다 줄바꿈
    let lastY: number | null = null;
    let buf = '';
    for (const item of items) {
      const str: string = item.str ?? '';
      const y = item.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 4) buf += '\n';
      buf += str;
      lastY = y;
    }
    pages.push(`\n\n=== p.${i} ===\n${buf.trim()}`);
  }
  await doc.destroy?.();
  return pages.join('\n');
}

function unitFilePath(spec: InputSpec, unitNumber: number): string {
  const fname = `${spec.grade}-${spec.semester}-${spec.subject}-${unitNumber}.md`;
  return path.join(OUT_DIR, fname);
}

function unitKey(spec: InputSpec, unitNumber: number): string {
  return `${spec.grade}-${spec.semester}-${spec.subject}-${unitNumber}`;
}

function toMarkdown(spec: InputSpec, u: UnitOutput): string {
  const fm = [
    '---',
    `unitKey: "${unitKey(spec, u.unitNumber)}"`,
    `grade: ${spec.grade}`,
    `semester: ${spec.semester}`,
    `subject: "${spec.subject}"`,
    `subjectLabel: "${spec.subjectLabel}"`,
    spec.publisher ? `publisher: "${spec.publisher}"` : '',
    `unitNumber: ${u.unitNumber}`,
    `unitTitle: "${u.unitTitle.replace(/"/g, '\\"')}"`,
    u.pageStart != null ? `pageStart: ${u.pageStart}` : '',
    u.pageEnd != null ? `pageEnd: ${u.pageEnd}` : '',
    `suggestedActivityType: "${u.suggestedActivityType}"`,
    'achievements:',
    ...u.achievements.map((a) => `  - "${a.replace(/"/g, '\\"')}"`),
    'coreConcepts:',
    ...u.coreConcepts.map((c) => `  - "${c.replace(/"/g, '\\"')}"`),
    'keyTopics:',
    ...u.keyTopics.map((t) => `  - "${t.replace(/"/g, '\\"')}"`),
    'suggestedMovieThemes:',
    ...u.suggestedMovieThemes.map((m) => `  - "${m.replace(/"/g, '\\"')}"`),
    '---',
    '',
    `# ${u.unitTitle}`,
    '',
    `> ${spec.subjectLabel} ${spec.grade}-${spec.semester} · ${spec.publisher || ''}`,
    '',
    '## 성취기준',
    ...u.achievements.map((a) => `- ${a}`),
    '',
    '## 핵심 개념',
    ...u.coreConcepts.map((c) => `- ${c}`),
    '',
    '## 단원 요약',
    u.bodySummary,
    '',
    '## 영화 학습지 추천 단서',
    `- **추천 활동 유형**: ${u.suggestedActivityType}`,
    `- **연결 주제**: ${u.keyTopics.join(', ')}`,
    `- **어울리는 영화 장르/소재**: ${u.suggestedMovieThemes.join(', ')}`,
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
  return fm;
}

async function processOne(ai: GoogleGenAI, spec: InputSpec): Promise<void> {
  const label = `[${spec.grade}-${spec.semester} ${spec.subjectLabel}]`;
  console.log(`\n${label} 처리 시작 → ${path.basename(spec.pdfPath)}`);

  if (!fs.existsSync(spec.pdfPath)) {
    console.error(`${label} ❌ 파일 없음: ${spec.pdfPath}`);
    return;
  }

  const existing = fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.startsWith(`${spec.grade}-${spec.semester}-${spec.subject}-`));
  if (existing.length > 0 && !FORCE) {
    console.log(`${label} ⏭  이미 ${existing.length}개 파일 존재 — skip (--force로 재처리)`);
    return;
  }

  // 1) PDF에서 텍스트 추출
  console.log(`${label} PDF 텍스트 추출 중...`);
  const text = await extractPdfText(spec.pdfPath);
  console.log(`${label} 추출 완료 (${(text.length / 1000).toFixed(1)}K chars)`);

  // 캐시(디버그용) 저장
  const cachePath = path.join(OUT_DIR, `_text-${spec.grade}-${spec.semester}-${spec.subject}.txt`);
  fs.writeFileSync(cachePath, text, 'utf8');

  // 2) Gemini 분석
  console.log(`${label} Gemini 분석 호출 (gemini-2.5-pro)...`);
  let response: any = null;
  let lastErr: any = null;
  for (const model of ['gemini-2.5-pro', 'gemini-2.5-flash']) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: `${SYSTEM_PROMPT}\n\n[교과서 본문]\n${text}`,
        config: { temperature: 0.3 },
      });
      console.log(`${label} ✅ ${model} 성공`);
      break;
    } catch (e: any) {
      lastErr = e;
      console.warn(`${label} ⚠️  ${model} 실패: ${e?.message?.slice(0, 200)}`);
      response = null;
    }
  }
  if (!response) {
    console.error(`${label} ❌ 모든 모델 실패:`, lastErr?.message || lastErr);
    return;
  }

  const responseText = response.text || '';
  let units: UnitOutput[];
  try {
    units = cleanJson<UnitOutput[]>(responseText);
  } catch (e: any) {
    console.error(`${label} ❌ JSON 파싱 실패:`, e?.message);
    fs.writeFileSync(
      path.join(OUT_DIR, `_raw-${spec.grade}-${spec.semester}-${spec.subject}.txt`),
      responseText
    );
    return;
  }
  if (!Array.isArray(units) || units.length === 0) {
    console.error(`${label} ❌ 단원이 추출되지 않음`);
    return;
  }

  // 3) MD 파일 작성
  for (const u of units) {
    const out = unitFilePath(spec, u.unitNumber);
    fs.writeFileSync(out, toMarkdown(spec, u), { encoding: 'utf8' });
    console.log(`${label} ✏️  ${path.relative(PROJECT_ROOT, out)}  →  ${u.unitTitle}`);
  }
  console.log(`${label} ✅ ${units.length}개 단원 저장 완료`);
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY가 .env.local 또는 환경변수에 없습니다.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const targets = ONLY ? INPUTS.filter((i) => i.subject === ONLY) : INPUTS;
  console.log(`처리 대상: ${targets.length}개 (force=${FORCE})`);

  for (const spec of targets) {
    try {
      await processOne(ai, spec);
    } catch (err: any) {
      console.error(
        `❌ 처리 실패 (${spec.subject} ${spec.grade}-${spec.semester}):`,
        err?.message || err
      );
    }
  }

  console.log('\n=== DONE ===');
  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.md'));
  console.log(`총 ${files.length}개 MD 파일 생성됨`);
}

main();
