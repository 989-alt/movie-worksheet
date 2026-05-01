/**
 * pdf-lib 기반 텍스트 PDF 생성기 (Phase E3)
 * html2canvas 래스터 방식 대비: 검색가능·복사가능·1~2MB 수준
 */
import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts, LineCapStyle } from 'pdf-lib';
// fontkit: Vite는 CJS 모듈에 default interop을 적용하므로 default import가 동작.
// `import * as fontkit`로 바꾸면 번들에서 `fontkit.create`가 undefined가 됨.
import fontkit from '@pdf-lib/fontkit';
import type { EditorBlock, VocabularyItem } from '../types';

// ─── A4 레이아웃 상수 (PDF points, 1pt = 1/72 inch) ─────────────────────────
const PW = 595.28;
const PH = 841.89;
const ML = 45;   // left margin
const MR = 45;   // right margin
const MT = 48;   // top margin
const MB = 48;   // bottom margin
const CW = PW - ML - MR;  // 505.28pt

// ─── 폰트 캐시 ───────────────────────────────────────────────────────────────
const _fontCache: Record<string, ArrayBuffer> = {};

async function loadFont(path: string): Promise<ArrayBuffer> {
  if (_fontCache[path]) return _fontCache[path];
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Font fetch failed: ${path}`);
  const buf = await res.arrayBuffer();
  _fontCache[path] = buf;
  return buf;
}

// ─── 색상 변환 ───────────────────────────────────────────────────────────────
function hexRgb(hex: string) {
  const h = hex.replace('#', '');
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  );
}
const BLACK   = rgb(0.118, 0.118, 0.118);  // #1e1e1e
const DARK    = rgb(0.216, 0.259, 0.345);  // #374151
const GRAY    = rgb(0.580, 0.624, 0.710);  // #94a3b8
const LIGHT   = rgb(0.941, 0.953, 0.969);  // #f0f4f8
const WHITE   = rgb(1, 1, 1);
const RULE    = rgb(0.882, 0.902, 0.925);  // #e2e8f0 줄선 색

// ─── 한글 판별 ────────────────────────────────────────────────────────────────
function isKorean(ch: string | undefined): boolean {
  if (!ch) return false;
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0xAC00 && c <= 0xD7A3)   // 한글 음절
    || (c >= 0x1100 && c <= 0x11FF)     // 한글 자모
    || (c >= 0x3130 && c <= 0x318F)     // 한글 호환 자모
    || (c >= 0x3000 && c <= 0x303F)     // CJK 기호·부호
    || (c >= 0xFF00 && c <= 0xFFEF);    // 전각 ASCII
}

// ─── 텍스트 세그먼트 분리 ────────────────────────────────────────────────────
function segmentText(text: string | undefined | null): Array<{ t: string; kor: boolean }> {
  const segs: Array<{ t: string; kor: boolean }> = [];
  if (!text) return segs;
  const s = String(text);
  let buf = '';
  let curKor = isKorean(s[0]);
  for (const ch of s) {
    const k = isKorean(ch);
    if (k === curKor) {
      buf += ch;
    } else {
      if (buf) segs.push({ t: buf, kor: curKor });
      buf = ch;
      curKor = k;
    }
  }
  if (buf) segs.push({ t: buf, kor: curKor });
  return segs;
}

// ─── 텍스트 폭 측정 ──────────────────────────────────────────────────────────
function measureText(text: string, korFont: PDFFont, latFont: PDFFont, size: number): number {
  return segmentText(text).reduce((sum, seg) => {
    const f = seg.kor ? korFont : latFont;
    return sum + f.widthOfTextAtSize(seg.t, size);
  }, 0);
}

// ─── 단어 단위 줄바꿈 ────────────────────────────────────────────────────────
function wrapLines(
  text: string | undefined | null,
  korFont: PDFFont,
  latFont: PDFFont,
  size: number,
  maxW: number,
): string[] {
  if (!text) return [''];
  // 한글은 공백 없이도 줄바꿈 가능하지만, 단어 단위로만 처리 (실용적)
  const words = String(text).split(/(\s+)/);
  const lines: string[] = [];
  let line = '';
  for (const token of words) {
    const test = line + token;
    if (measureText(test, korFont, latFont, size) > maxW && line.trim()) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line = test;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.length ? lines : [''];
}

// ─── 혼합 텍스트 그리기 ──────────────────────────────────────────────────────
function drawMixed(
  page: PDFPage,
  text: string,
  korFont: PDFFont,
  latFont: PDFFont,
  x: number,
  y: number,
  size: number,
  color = DARK,
) {
  let cx = x;
  for (const seg of segmentText(text)) {
    const f = seg.kor ? korFont : latFont;
    page.drawText(seg.t, { x: cx, y, size, font: f, color });
    cx += f.widthOfTextAtSize(seg.t, size);
  }
}

// ─── 여러 줄 혼합 텍스트 그리기 ─────────────────────────────────────────────
function drawWrapped(
  ctx: Ctx,
  text: string,
  x: number,
  size: number,
  color = DARK,
  lineH?: number,
): number {
  const lh = lineH ?? size * 1.65;
  const lines = wrapLines(text, ctx.kor, ctx.lat, size, CW - (x - ML));
  for (const line of lines) {
    if (ctx.y - lh < MB + 30) nextPage(ctx);
    drawMixed(ctx.page, line, ctx.kor, ctx.lat, x, ctx.y - size * 0.85, size, color);
    ctx.y -= lh;
  }
  return lines.length * lh;
}

// ─── 컨텍스트 타입 ───────────────────────────────────────────────────────────
interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  kor: PDFFont;   // Korean regular
  korB: PDFFont;  // Korean bold
  lat: PDFFont;   // Latin regular
  latB: PDFFont;  // Latin bold
  y: number;      // 현재 Y (상단 기준, 점점 감소)
  themeHex: string;
  audience: 'student' | 'teacher';
  pageNum: number;
}

function newPage(ctx: Ctx): PDFPage {
  const p = ctx.doc.addPage([PW, PH]);
  ctx.page = p;
  ctx.y = PH - MT;
  ctx.pageNum++;
  return p;
}

function nextPage(ctx: Ctx) {
  drawPageNum(ctx);
  newPage(ctx);
}

function drawPageNum(ctx: Ctx) {
  const label = `— ${ctx.pageNum} —`;
  const w = ctx.lat.widthOfTextAtSize(label, 9);
  ctx.page.drawText(label, {
    x: (PW - w) / 2,
    y: MB - 14,
    size: 9,
    font: ctx.lat,
    color: GRAY,
  });
}

function gap(ctx: Ctx, pt: number) {
  ctx.y -= pt;
}

// ─── 섹션 헤더 그리기 ────────────────────────────────────────────────────────
function drawSectionHeader(ctx: Ctx, title: string) {
  const barH = 16;
  const theme = hexRgb(ctx.themeHex);
  // 좌측 컬러 바
  ctx.page.drawRectangle({
    x: ML,
    y: ctx.y - barH,
    width: 4,
    height: barH,
    color: theme,
  });
  // 헤더 텍스트
  drawMixed(ctx.page, title, ctx.korB, ctx.latB, ML + 10, ctx.y - 13, 14, BLACK);
  ctx.y -= barH + 2;
  // 구분선
  ctx.page.drawLine({
    start: { x: ML, y: ctx.y },
    end: { x: PW - MR, y: ctx.y },
    thickness: 0.5,
    color: RULE,
  });
  ctx.y -= 8;
}

// ─── HTML 파싱 (text 블록용) ─────────────────────────────────────────────────
type ParsedEl =
  | { kind: 'h2'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'li'; text: string }
  | { kind: 'q'; num: string; text: string }
  | { kind: 'chip'; text: string }
  | { kind: 'blank'; h: number }
  | { kind: 'skip' };

function parseHtml(html: string): ParsedEl[] {
  const div = document.createElement('div');
  div.innerHTML = html;
  const res: ParsedEl[] = [];

  function walk(el: Element) {
    const tag = el.tagName?.toLowerCase() ?? '';
    const text = el.textContent?.trim() ?? '';

    if (tag === 'h2') {
      if (text) res.push({ kind: 'h2', text });

    } else if (tag === 'p') {
      if (text) res.push({ kind: 'p', text });

    } else if (tag === 'ul') {
      el.querySelectorAll('li').forEach((li) => {
        const t = li.textContent?.trim();
        if (t) res.push({ kind: 'li', text: t });
      });

    } else if (tag === 'div') {
      // Q&A box: contains <strong>Q#.</strong>
      const htmlEl = el as HTMLElement;
      const strong = el.querySelector('strong');
      const qMatch = strong?.textContent?.match(/^(Q\d+\.?)\s*$/);
      if (qMatch) {
        const spans = Array.from(el.querySelectorAll('span')) as HTMLElement[];
        const qText = spans.find(s => !s.style.whiteSpace)?.textContent?.trim() ?? text.replace(qMatch[0], '').replace('2~3문장', '').trim();
        res.push({ kind: 'q', num: qMatch[1], text: qText });
      } else if (htmlEl.style.height && /px$/.test(htmlEl.style.height)) {
        // Inline blank box (writing area inside text block)
        res.push({ kind: 'blank', h: parseInt(htmlEl.style.height) });
      } else {
        // Generic div — recurse
        Array.from(el.children).forEach(walk);
      }

    } else if (tag === 'span') {
      const htmlSpan = el as HTMLElement;
      // Topic chip
      if (text && htmlSpan.style.borderRadius) res.push({ kind: 'chip', text });
      else if (text) res.push({ kind: 'p', text });

    } else {
      Array.from(el.children).forEach(walk);
    }
  }

  Array.from(div.children).forEach(walk);
  return res.filter((e) => e.kind !== 'skip');
}

// ─── BLOCK RENDERERS ─────────────────────────────────────────────────────────

function renderHeader(ctx: Ctx, block: EditorBlock) {
  const theme = hexRgb(ctx.themeHex);
  const title = block.content;
  const { director, releaseYear, genre, ottProviders } = block.data ?? {};

  // Title
  const titleSize = 26;
  const titleLines = wrapLines(title, ctx.korB, ctx.latB, titleSize, CW);
  for (const line of titleLines) {
    const w = measureText(line, ctx.korB, ctx.latB, titleSize);
    drawMixed(ctx.page, line, ctx.korB, ctx.latB, (PW - w) / 2, ctx.y - titleSize, titleSize, theme);
    ctx.y -= titleSize * 1.3;
  }

  // Subtitle
  const sub = 'Movie Worksheet';
  const subW = ctx.lat.widthOfTextAtSize(sub, 9);
  ctx.page.drawText(sub, { x: (PW - subW) / 2, y: ctx.y - 9, size: 9, font: ctx.lat, color: GRAY });
  ctx.y -= 20;

  // Chips: director · year · genre
  const chips = [director, releaseYear, genre].filter(Boolean) as string[];
  const chipH = 16;
  const chipPadX = 12;
  const gap8 = 8;
  let cx = ML;
  const totalChipW = chips.reduce((s, c) => s + measureText(c, ctx.korB, ctx.lat, 10) + chipPadX * 2, 0) + gap8 * (chips.length - 1);
  cx = (PW - totalChipW) / 2;
  for (const chip of chips) {
    const tw = measureText(chip, ctx.korB, ctx.lat, 10);
    const boxW = tw + chipPadX * 2;
    ctx.page.drawRectangle({ x: cx, y: ctx.y - chipH, width: boxW, height: chipH, borderColor: theme, borderWidth: 1, color: WHITE });
    drawMixed(ctx.page, chip, ctx.korB, ctx.lat, cx + chipPadX, ctx.y - chipH + 4, 10, theme);
    cx += boxW + gap8;
  }
  ctx.y -= chipH + 6;

  // OTT providers
  if (Array.isArray(ottProviders) && ottProviders.length > 0) {
    const providers = ottProviders.slice(0, 5).map((p: any) => p.provider_name).join(' · ');
    const label = '시청 가능: ' + providers;
    const lw = measureText(label, ctx.kor, ctx.lat, 9);
    drawMixed(ctx.page, label, ctx.kor, ctx.lat, (PW - lw) / 2, ctx.y - 9, 9, GRAY);
    ctx.y -= 16;
  }

  // Bottom border
  ctx.page.drawLine({ start: { x: ML, y: ctx.y - 2 }, end: { x: PW - MR, y: ctx.y - 2 }, thickness: 1.5, color: theme });
  ctx.y -= 14;
}

function renderText(ctx: Ctx, block: EditorBlock) {
  const elements = parseHtml(block.content);
  const theme = hexRgb(ctx.themeHex);
  const bodySize = 11;
  const lh = bodySize * 1.65;

  for (const el of elements) {
    if (ctx.y - 40 < MB) nextPage(ctx);

    if (el.kind === 'h2') {
      gap(ctx, 4);
      drawSectionHeader(ctx, el.text);

    } else if (el.kind === 'p') {
      gap(ctx, 2);
      drawWrapped(ctx, el.text, ML, bodySize);
      gap(ctx, 2);

    } else if (el.kind === 'li') {
      gap(ctx, 1);
      ctx.page.drawText('•', { x: ML, y: ctx.y - bodySize * 0.85, size: bodySize, font: ctx.lat, color: DARK });
      drawWrapped(ctx, el.text, ML + 12, bodySize);

    } else if (el.kind === 'q') {
      // Q&A box
      const qLines = wrapLines(el.text, ctx.kor, ctx.lat, bodySize, CW - 50);
      const boxH = Math.max(40, qLines.length * lh + 18);
      if (ctx.y - boxH < MB) nextPage(ctx);

      ctx.page.drawRectangle({ x: ML, y: ctx.y - boxH, width: CW, height: boxH, color: LIGHT });
      ctx.page.drawRectangle({ x: ML, y: ctx.y - boxH, width: 4, height: boxH, color: theme });

      const numW = ctx.latB.widthOfTextAtSize(el.num + ' ', 11);
      ctx.page.drawText(el.num, { x: ML + 10, y: ctx.y - boxH / 2 - 4, size: 11, font: ctx.latB, color: theme });
      let qy = ctx.y - 13;
      for (const line of qLines) {
        drawMixed(ctx.page, line, ctx.kor, ctx.lat, ML + 10 + numW, qy, bodySize, DARK);
        qy -= lh;
      }
      // word count hint
      const hint = '2~3문장';
      const hw = ctx.lat.widthOfTextAtSize(hint, 8);
      ctx.page.drawText(hint, { x: ML + CW - hw - 8, y: ctx.y - 13, size: 8, font: ctx.lat, color: GRAY });
      ctx.y -= boxH + 4;

    } else if (el.kind === 'chip') {
      // Chips: try to fit inline (simplified: render as list)
      const chipH = 15;
      const tw = measureText(el.text, ctx.kor, ctx.lat, 9);
      const bw = tw + 16;
      ctx.page.drawRectangle({ x: ML, y: ctx.y - chipH, width: bw, height: chipH, borderColor: theme, borderWidth: 1, color: WHITE });
      drawMixed(ctx.page, el.text, ctx.kor, ctx.lat, ML + 8, ctx.y - chipH + 3, 9, theme);
      ctx.y -= chipH + 4;

    } else if (el.kind === 'blank') {
      // Inline blank box (e.g., writing area in questions section)
      const h = Math.min(el.h * 0.75, 180); // scale px→pt
      if (ctx.y - h < MB) nextPage(ctx);
      _drawRuledBox(ctx.page, ML, ctx.y - h, CW, h);
      ctx.y -= h + 6;
    }
  }
}

function _drawRuledBox(page: PDFPage, x: number, y: number, w: number, h: number) {
  page.drawRectangle({ x, y, width: w, height: h, borderColor: RULE, borderWidth: 1.5, color: rgb(0.973, 0.984, 0.996) });
  const spacing = 23;
  let ly = y + h - spacing;
  while (ly > y + 4) {
    page.drawLine({ start: { x: x + 6, y: ly }, end: { x: x + w - 6, y: ly }, thickness: 0.4, color: RULE });
    ly -= spacing;
  }
}

function renderBlankBox(ctx: Ctx, block: EditorBlock) {
  const h = Math.min((block.height ?? 150) * 0.72, 250);
  if (ctx.y - h - 20 < MB) nextPage(ctx);

  if (block.label) {
    ctx.page.drawText(block.label.toUpperCase(), { x: ML, y: ctx.y - 9, size: 8, font: ctx.latB, color: GRAY });
    ctx.y -= 13;
  }

  if (block.lined) {
    _drawRuledBox(ctx.page, ML, ctx.y - h, CW, h);
  } else {
    const bStyle = block.borderStyle;
    ctx.page.drawRectangle({
      x: ML,
      y: ctx.y - h,
      width: CW,
      height: h,
      borderColor: bStyle === 'none' ? WHITE : RULE,
      borderWidth: bStyle === 'none' ? 0 : 1.5,
      color: rgb(0.973, 0.984, 0.996),
    });
  }
  ctx.y -= h + 6;
}

function renderPredictionBox(ctx: Ctx, block: EditorBlock) {
  drawSectionHeader(ctx, '시청 전 예측');
  const prompt = block.content || '제목과 영화 정보를 보고 시청 전에 어떤 내용일지 예측해보세요.';
  drawWrapped(ctx, prompt, ML, 10, GRAY);
  gap(ctx, 4);
  const h = Math.min((block.height ?? 110) * 0.72, 130);
  if (ctx.y - h - 10 < MB) nextPage(ctx);
  _drawRuledBox(ctx.page, ML, ctx.y - h, CW, h);
  ctx.y -= h + 10;
}

function renderVocabularyTable(ctx: Ctx, block: EditorBlock) {
  const items: VocabularyItem[] = block.data?.items ?? [];
  if (items.length === 0) return;

  drawSectionHeader(ctx, '핵심 어휘');

  const theme = hexRgb(ctx.themeHex);
  const rowH = 24;
  const wordColW = CW * 0.38;
  const defColW = CW - wordColW;
  const showDef = ctx.audience === 'teacher';

  // Header row
  const headerH = 22;
  if (ctx.y - headerH - items.length * rowH < MB) nextPage(ctx);

  // Header tint: 92% theme + 8% white
  const t = hexRgb(ctx.themeHex) as any;
  const tint = rgb(
    Math.min(1, t.red * 0.92 + 0.08),
    Math.min(1, t.green * 0.92 + 0.08),
    Math.min(1, t.blue * 0.92 + 0.08),
  );
  ctx.page.drawRectangle({ x: ML, y: ctx.y - headerH, width: CW, height: headerH, color: tint });
  ctx.page.drawText('어휘', { x: ML + 8, y: ctx.y - 15, size: 10, font: ctx.korB, color: BLACK });
  ctx.page.drawText(showDef ? '정의 및 설명' : '뜻 / 나의 생각', { x: ML + wordColW + 8, y: ctx.y - 15, size: 10, font: ctx.korB, color: BLACK });
  // Header bottom border (theme color)
  ctx.page.drawLine({ start: { x: ML, y: ctx.y - headerH }, end: { x: ML + CW, y: ctx.y - headerH }, thickness: 1.5, color: theme });
  ctx.y -= headerH;

  // Rows
  for (const item of items) {
    ctx.page.drawLine({ start: { x: ML, y: ctx.y - rowH }, end: { x: ML + CW, y: ctx.y - rowH }, thickness: 0.4, color: RULE });
    // Word column (bold)
    drawMixed(ctx.page, item.word, ctx.korB, ctx.latB, ML + 8, ctx.y - 16, 10.5, BLACK);
    // Separator
    ctx.page.drawLine({ start: { x: ML + wordColW, y: ctx.y }, end: { x: ML + wordColW, y: ctx.y - rowH }, thickness: 0.4, color: RULE });
    // Definition column
    if (showDef && item.definition) {
      const lines = wrapLines(item.definition, ctx.kor, ctx.lat, 9.5, defColW - 16);
      lines.slice(0, 1).forEach((l) => {
        drawMixed(ctx.page, l, ctx.kor, ctx.lat, ML + wordColW + 8, ctx.y - 16, 9.5, DARK);
      });
    }
    ctx.y -= rowH;
  }

  // Bottom border
  ctx.page.drawLine({ start: { x: ML, y: ctx.y }, end: { x: ML + CW, y: ctx.y }, thickness: 0.5, color: RULE });
  ctx.y -= 10;
}

function renderOneLiner(ctx: Ctx, block: EditorBlock) {
  drawSectionHeader(ctx, '한 줄 평');
  const prompt = block.content || '이 영화를 한 문장으로 표현한다면?';
  drawWrapped(ctx, prompt, ML, 10, GRAY);
  gap(ctx, 4);
  const h = 50;
  if (ctx.y - h < MB) nextPage(ctx);
  _drawRuledBox(ctx.page, ML, ctx.y - h, CW, h);
  ctx.y -= h + 10;
}

function renderSelfAssessment(ctx: Ctx, block: EditorBlock) {
  const items: string[] = block.data?.items ?? [];
  if (items.length === 0) return;

  drawSectionHeader(ctx, '자기평가');

  const theme = hexRgb(ctx.themeHex);
  const symbols = ['○', '△', '×'];
  const circleR = 10;
  const rowH = 30;
  const bodySize = 10.5;

  for (let i = 0; i < items.length; i++) {
    if (ctx.y - rowH < MB) nextPage(ctx);

    // Separator (except first)
    if (i > 0) {
      ctx.page.drawLine({ start: { x: ML, y: ctx.y }, end: { x: ML + CW, y: ctx.y }, thickness: 0.3, color: RULE });
    }

    // ○△× circles
    const cx0 = ML + 4;
    for (let si = 0; si < 3; si++) {
      const cx = cx0 + si * (circleR * 2 + 5);
      ctx.page.drawCircle({ x: cx + circleR, y: ctx.y - rowH / 2, size: circleR, borderColor: RULE, borderWidth: 1.2, color: WHITE });
      const sw = ctx.lat.widthOfTextAtSize(symbols[si], 10);
      ctx.page.drawText(symbols[si], {
        x: cx + circleR - sw / 2,
        y: ctx.y - rowH / 2 - 4,
        size: 10,
        font: ctx.lat,
        color: GRAY,
      });
    }

    // Item text
    const textX = cx0 + 3 * (circleR * 2 + 5) + 8;
    const textW = CW - (textX - ML) - 4;
    const lines = wrapLines(items[i], ctx.kor, ctx.lat, bodySize, textW);
    const totalTH = lines.length * bodySize * 1.6;
    let ty = ctx.y - (rowH - totalTH) / 2 - bodySize * 0.85;
    for (const line of lines) {
      drawMixed(ctx.page, line, ctx.kor, ctx.lat, textX, ty, bodySize, DARK);
      ty -= bodySize * 1.6;
    }

    ctx.y -= rowH;
  }
  ctx.y -= 6;
}

// ─── Teacher watermark ───────────────────────────────────────────────────────
function drawTeacherWatermark(ctx: Ctx) {
  for (let i = 0; i < ctx.pageNum; i++) {
    const page = ctx.doc.getPage(i);
    const label = '교사용';
    const w = ctx.korB.widthOfTextAtSize(label, 9);
    page.drawText(label, {
      x: PW - MR - w,
      y: MB - 14,
      size: 9,
      font: ctx.korB,
      color: rgb(0.8, 0.2, 0.2),
    });
  }
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────
export interface PdfOptions {
  audience?: 'student' | 'teacher';
  fileName?: string;
}

export async function generatePdfFromBlocks(
  blocks: EditorBlock[],
  themeHex: string,
  opts: PdfOptions = {},
): Promise<void> {
  const audience = opts.audience ?? 'student';
  const fileName = opts.fileName ?? '학습지';

  // Load fonts
  const [korBytes, korBBytes, latBytes] = await Promise.all([
    loadFont('/fonts/NotoSansKR-Regular.woff'),
    loadFont('/fonts/NotoSansKR-Bold.woff'),
    loadFont('/fonts/NotoSansKR-Latin.woff'),
  ]);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const [kor, korB, latF, latB] = await Promise.all([
    doc.embedFont(korBytes, { subset: true }),
    doc.embedFont(korBBytes, { subset: true }),
    doc.embedFont(latBytes, { subset: true }),
    doc.embedFont(latBytes, { subset: true }),  // Bold Latin: use same as regular for simplicity
  ]);

  const firstPage = doc.addPage([PW, PH]);

  const ctx: Ctx = {
    doc,
    page: firstPage,
    kor,
    korB,
    lat: latF,
    latB,
    y: PH - MT,
    themeHex,
    audience,
    pageNum: 1,
  };

  for (const block of blocks) {
    if (ctx.y < MB + 60) nextPage(ctx);

    switch (block.type) {
      case 'header':
        renderHeader(ctx, block);
        break;
      case 'text':
        renderText(ctx, block);
        break;
      case 'blank_box':
        renderBlankBox(ctx, block);
        break;
      case 'prediction_box':
        renderPredictionBox(ctx, block);
        break;
      case 'vocabulary_table':
        renderVocabularyTable(ctx, block);
        break;
      case 'one_liner':
        renderOneLiner(ctx, block);
        break;
      case 'self_assessment':
        renderSelfAssessment(ctx, block);
        break;
      case 'page_break':
        nextPage(ctx);
        break;
    }

    gap(ctx, 6);
  }

  // Page numbers on last page
  drawPageNum(ctx);

  // Teacher watermark
  if (audience === 'teacher') drawTeacherWatermark(ctx);

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_${audience === 'teacher' ? '교사용' : '학생용'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
