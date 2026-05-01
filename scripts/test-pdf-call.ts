/**
 * 최소 진단 — PDF 업로드 후 간단한 prompt로 generateContent 호출
 * 실패 시 REST API로도 fallback해서 정확한 에러 디테일 확인
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

function loadEnv() {
  const p = path.resolve(PROJECT_ROOT, '.env.local');
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
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
loadEnv();

const API_KEY = process.env.GEMINI_API_KEY!;
if (!API_KEY) { console.error('no key'); process.exit(1); }

const PDF = path.join(PROJECT_ROOT, '.tmp-uploads', 'social_6_1.pdf');

async function main() {
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  if (!fs.existsSync(PDF)) {
    console.log('PDF 없음, 업로드 스킵');
    process.exit(1);
  }

  console.log('업로드 중...');
  let uploaded = await ai.files.upload({
    file: PDF,
    config: { mimeType: 'application/pdf', displayName: 'test.pdf' },
  });
  while (uploaded.state === 'PROCESSING' || !uploaded.uri) {
    await new Promise((r) => setTimeout(r, 3000));
    uploaded = await ai.files.get({ name: uploaded.name! });
  }
  console.log('업로드 완료:', JSON.stringify(uploaded, null, 2));

  // 1차 시도 — SDK 헬퍼
  console.log('\n=== Test 1: SDK helper ===');
  try {
    const r1 = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: createUserContent([
        createPartFromUri(uploaded.uri!, uploaded.mimeType || 'application/pdf'),
        '이 PDF의 첫 페이지에 무엇이 있나요? 한 문장으로.',
      ]),
    });
    console.log('Test 1 OK:', r1.text?.slice(0, 200));
  } catch (e: any) {
    console.log('Test 1 FAIL:', e?.message?.slice(0, 500));
  }

  // 2차 시도 — REST 직접 호출 (fileData 형식)
  console.log('\n=== Test 2: REST fileData ===');
  try {
    const restRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType } },
                { text: '이 PDF의 첫 페이지에 무엇이 있나요? 한 문장으로.' },
              ],
            },
          ],
        }),
      }
    );
    const json = await restRes.json();
    console.log('Test 2 status:', restRes.status);
    console.log('Test 2 body:', JSON.stringify(json, null, 2).slice(0, 1500));
  } catch (e: any) {
    console.log('Test 2 FAIL:', e?.message);
  }

  // 3차 시도 — REST file_data (snake_case)
  console.log('\n=== Test 3: REST file_data snake_case ===');
  try {
    const restRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { file_data: { file_uri: uploaded.uri, mime_type: uploaded.mimeType } },
                { text: '이 PDF의 첫 페이지에 무엇이 있나요? 한 문장으로.' },
              ],
            },
          ],
        }),
      }
    );
    const json = await restRes.json();
    console.log('Test 3 status:', restRes.status);
    console.log('Test 3 body:', JSON.stringify(json, null, 2).slice(0, 1500));
  } catch (e: any) {
    console.log('Test 3 FAIL:', e?.message);
  }

  // 정리
  try {
    await ai.files.delete({ name: uploaded.name! });
    console.log('\n파일 삭제 완료');
  } catch {}
}

main().catch((e) => console.error('FATAL:', e));
