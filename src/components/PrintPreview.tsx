import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EditorBlock, DesignStyle, VocabularyItem } from '../types';

interface PrintPreviewProps {
  blocks: EditorBlock[];
  previewId?: string;
  themeColor: string;
  designStyle: DesignStyle;
  backgroundColor?: string;
}

// ─── A4 layout constants (CSS px @ 96dpi) ────────────────────────────────────
const PAGE_HEIGHT = 1123;
const PAGE_PADDING_TOP = 40;
const PAGE_PADDING_BOTTOM = 40;
const FOOTER_RESERVE = 24; // 페이지 번호 영역
const BLOCK_GAP = 24; // mb-6
const AVAIL_HEIGHT = PAGE_HEIGHT - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM - FOOTER_RESERVE;

// Section header with colored left bar — replaces emoji headers in print view
function SectionHeader({ title, themeColor }: { title: string; themeColor: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
        paddingBottom: '6px',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          width: '4px',
          height: '22px',
          backgroundColor: themeColor,
          borderRadius: '2px',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#1e293b',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </span>
    </div>
  );
}

// ─── Block renderer (shared by measurement pass + visible pages) ─────────────
function BlockBody({
  block,
  themeColor,
  designStyle,
}: {
  block: EditorBlock;
  themeColor: string;
  designStyle: DesignStyle;
}) {
  const getHeaderStyle = () => {
    const base = 'text-center mb-8 pb-4 ';
    if (designStyle === 'retro') return base + 'border-b-4 border-double';
    if (designStyle === 'playful') return base + 'border-b-4 border-dashed rounded-b-3xl';
    return base + 'border-b-2';
  };

  if (block.type === 'header') {
    return (
      <div className={getHeaderStyle()} style={{ borderColor: themeColor }}>
        <h1 className="text-4xl font-bold mb-2" style={{ color: themeColor }}>
          {block.content}
        </h1>
        <p className="text-sm tracking-widest uppercase opacity-60">Movie Worksheet</p>
        <div className="mt-6 flex justify-center gap-6 text-sm font-medium opacity-80 flex-wrap">
          <div className="px-3 py-1 border rounded" style={{ borderColor: themeColor }}>
            {block.data?.director}
          </div>
          <div className="px-3 py-1 border rounded" style={{ borderColor: themeColor }}>
            {block.data?.releaseYear}
          </div>
          <div className="px-3 py-1 border rounded" style={{ borderColor: themeColor }}>
            {block.data?.genre}
          </div>
        </div>
        {Array.isArray(block.data?.ottProviders) && block.data.ottProviders.length > 0 && (
          <div className="mt-3 flex justify-center gap-2 text-xs opacity-90 flex-wrap">
            <span className="opacity-60">시청 가능:</span>
            {block.data.ottProviders.slice(0, 5).map((p: any) => (
              <span
                key={p.provider_id}
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: themeColor + '15', color: themeColor }}
              >
                {p.provider_name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (block.type === 'text') {
    return (
      <div
        className="prose max-w-none"
        style={{ fontSize: '14px', lineHeight: '1.7' }}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    );
  }

  if (block.type === 'blank_box') {
    return (
      <div>
        {block.label && (
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}
          >
            {block.label}
          </div>
        )}
        <div
          style={{
            height: block.height || 150,
            borderWidth: block.borderStyle === 'none' ? '0' : '2px',
            borderColor: '#cbd5e1',
            borderStyle: block.borderStyle || (designStyle === 'playful' ? 'dashed' : 'solid'),
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            backgroundImage: block.lined
              ? 'repeating-linear-gradient(to bottom, transparent, transparent calc(8mm - 1px), #e2e8f0 calc(8mm - 1px), #e2e8f0 8mm)'
              : undefined,
          }}
        />
      </div>
    );
  }

  if (block.type === 'prediction_box') {
    return (
      <div>
        <SectionHeader title="시청 전 예측" themeColor={themeColor} />
        <p
          style={{
            fontSize: '13px',
            color: '#64748b',
            marginBottom: '10px',
            fontStyle: 'italic',
          }}
        >
          {block.content || '제목과 영화 정보를 보고 어떤 내용일지 예측해보세요.'}
        </p>
        <div
          style={{
            height: block.height || 110,
            border: '2px solid #cbd5e1',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent, transparent calc(8mm - 1px), #e2e8f0 calc(8mm - 1px), #e2e8f0 8mm)',
          }}
        />
      </div>
    );
  }

  if (block.type === 'vocabulary_table') {
    return (
      <div>
        <SectionHeader title="핵심 어휘" themeColor={themeColor} />
        {!block.data?.items || block.data.items.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
            어휘 데이터가 없습니다.
          </p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: themeColor + '12' }}>
                <th
                  style={{
                    width: '38%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    borderBottom: `2px solid ${themeColor}`,
                    fontWeight: '700',
                    color: '#374151',
                    fontSize: '13px',
                  }}
                >
                  어휘
                </th>
                <th
                  style={{
                    width: '62%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    borderBottom: `2px solid ${themeColor}`,
                    fontWeight: '700',
                    color: '#374151',
                    fontSize: '13px',
                  }}
                >
                  뜻 / 나의 생각
                </th>
              </tr>
            </thead>
            <tbody>
              {(block.data.items as VocabularyItem[]).map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td
                    style={{
                      padding: '10px 12px',
                      fontWeight: '600',
                      color: '#1e293b',
                    }}
                  >
                    {item.word}
                  </td>
                  <td style={{ padding: '10px 12px' }} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  if (block.type === 'one_liner') {
    return (
      <div>
        <SectionHeader title="한 줄 평" themeColor={themeColor} />
        <p
          style={{
            fontSize: '13px',
            color: '#64748b',
            marginBottom: '10px',
            fontStyle: 'italic',
          }}
        >
          {block.content || '이 영화를 한 문장으로 표현한다면?'}
        </p>
        <div
          style={{
            height: '56px',
            border: '2px solid #cbd5e1',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
          }}
        />
      </div>
    );
  }

  if (block.type === 'self_assessment') {
    const items = (block.data?.items || []) as string[];
    return (
      <div>
        <SectionHeader title="자기평가" themeColor={themeColor} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {items.map((item: string, i: number) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '9px 0',
                borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                {['○', '△', '×'].map((sym) => (
                  <div
                    key={sym}
                    style={{
                      width: '26px',
                      height: '26px',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      color: '#94a3b8',
                      flexShrink: 0,
                    }}
                  >
                    {sym}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: '14px', color: '#374151' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Auto-pagination logic ───────────────────────────────────────────────────
function paginate(
  segments: EditorBlock[][],
  heightsById: Map<string, number>
): EditorBlock[][] {
  const newPages: EditorBlock[][] = [];
  for (const seg of segments) {
    let cur: EditorBlock[] = [];
    let curH = 0;
    for (const b of seg) {
      const h = heightsById.get(b.id) ?? 0;
      const cost = h + (cur.length > 0 ? BLOCK_GAP : 0);

      // Header always starts a new page
      if (b.type === 'header' && cur.length > 0) {
        newPages.push(cur);
        cur = [b];
        curH = h;
        continue;
      }

      // Overflow → start new page
      if (curH + cost > AVAIL_HEIGHT && cur.length > 0) {
        newPages.push(cur);
        cur = [b];
        curH = h;
      } else {
        cur.push(b);
        curH += cost;
      }
    }
    if (cur.length > 0) newPages.push(cur);
  }
  if (newPages.length === 0) newPages.push([]);
  return newPages;
}

// ─── Main component ──────────────────────────────────────────────────────────
const PrintPreview: React.FC<PrintPreviewProps> = ({
  blocks,
  previewId = 'print-preview',
  themeColor,
  designStyle,
  backgroundColor,
}) => {
  // Step 1: split by manual page_break blocks
  const manualSegments = useMemo<EditorBlock[][]>(() => {
    const out: EditorBlock[][] = [[]];
    for (const b of blocks) {
      if (b.type === 'page_break') {
        if (out[out.length - 1].length > 0) out.push([]);
      } else {
        out[out.length - 1].push(b);
      }
    }
    if (out.length > 1 && out[out.length - 1].length === 0) out.pop();
    if (out.length === 0) out.push([]);
    return out;
  }, [blocks]);

  // Step 2: measure block heights and pack into A4 pages
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<EditorBlock[][]>(manualSegments);

  // Re-measure when blocks change. Use a stable signature for the dep.
  const blocksSignature = useMemo(
    () => blocks.map((b) => `${b.id}:${b.type}:${b.height ?? ''}:${(b.content ?? '').length}`).join('|'),
    [blocks]
  );

  useLayoutEffect(() => {
    if (!measureRef.current) return;
    const heightsById = new Map<string, number>();
    measureRef.current.querySelectorAll<HTMLElement>('[data-mid]').forEach((el) => {
      const id = el.dataset.mid;
      if (id) heightsById.set(id, el.offsetHeight);
    });
    const newPages = paginate(manualSegments, heightsById);
    setPages(newPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocksSignature, manualSegments]);

  const getPageBackground = () => {
    if (backgroundColor && backgroundColor !== '#ffffff') return backgroundColor;
    switch (designStyle) {
      case 'retro':
        return '#fdf6e3';
      default:
        return '#ffffff';
    }
  };

  const renderableBlocks = blocks.filter((b) => b.type !== 'page_break');

  return (
    <div className="flex flex-col items-center gap-8 py-8 bg-slate-200 overflow-hidden">
      {/* Hidden measurement container — single column, full content, off-screen.
          Width matches visible page exactly so block heights match what users will see. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: '794px',
          padding: `${PAGE_PADDING_TOP}px 50px ${PAGE_PADDING_BOTTOM}px 50px`,
          boxSizing: 'border-box',
          fontFamily: '"Noto Sans KR", sans-serif',
          color: '#1e293b',
          pointerEvents: 'none',
        }}
      >
        {renderableBlocks.map((b) => (
          <div key={b.id} data-mid={b.id} className="mb-6 relative z-10">
            <BlockBody block={b} themeColor={themeColor} designStyle={designStyle} />
          </div>
        ))}
      </div>

      {/* Visible paginated pages — what html2canvas captures */}
      {pages.map((pageBlocks, pageIndex) => (
        <div
          key={pageIndex}
          className="a4-page-wrapper w-full flex justify-center"
          style={{ maxWidth: '100vw' }}
        >
          <div
            className={`a4-page-container shadow-2xl relative ${previewId}`}
            style={{
              width: '794px',
              minHeight: `${PAGE_HEIGHT}px`,
              maxHeight: `${PAGE_HEIGHT}px`,
              padding: `${PAGE_PADDING_TOP}px 50px ${PAGE_PADDING_BOTTOM}px 50px`,
              boxSizing: 'border-box',
              backgroundColor: getPageBackground(),
              fontFamily: '"Noto Sans KR", sans-serif',
              color: '#1e293b',
              transformOrigin: 'top center',
              overflow: 'hidden',
            }}
          >
            {/* Retro border decoration */}
            {designStyle === 'retro' && (
              <div
                className="absolute inset-0 border-[10px] border-double pointer-events-none"
                style={{ borderColor: themeColor + '40', margin: '15px' }}
              />
            )}
            {/* Playful circle decoration */}
            {designStyle === 'playful' && (
              <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                <svg width="100" height="100" viewBox="0 0 100 100" fill={themeColor}>
                  <circle cx="50" cy="50" r="40" />
                </svg>
              </div>
            )}

            {pageBlocks.map((block) => (
              <div key={block.id} className="mb-6 relative z-10">
                <BlockBody block={block} themeColor={themeColor} designStyle={designStyle} />
              </div>
            ))}

            {/* Page Footer */}
            <div className="absolute bottom-4 left-0 w-full text-center text-xs opacity-40">
              — {pageIndex + 1} / {pages.length} —
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PrintPreview;
