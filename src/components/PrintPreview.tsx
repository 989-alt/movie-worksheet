import React from 'react';
import { EditorBlock, DesignStyle } from '../types';

interface PrintPreviewProps {
  blocks: EditorBlock[];
  previewId?: string;
  themeColor: string;
  designStyle: DesignStyle;
  backgroundColor?: string;
}

const PrintPreview: React.FC<PrintPreviewProps> = ({
  blocks,
  previewId = 'print-preview',
  themeColor,
  designStyle,
  backgroundColor
}) => {
  // Split blocks into pages
  const pages: EditorBlock[][] = [];
  let currentPage: EditorBlock[] = [];

  blocks.forEach((block) => {
    if (block.type === 'page_break') {
      pages.push(currentPage);
      currentPage = [];
    } else {
      currentPage.push(block);
    }
  });
  if (currentPage.length > 0) pages.push(currentPage);
  if (pages.length === 0) pages.push([]);

  // Design Helpers - 기본 폰트 사용 (편집기에서 설정한 인라인 폰트 존중)
  const getFontFamily = () => {
    // 인라인 폰트 스타일을 존중하기 위해 기본 폰트만 설정
    // RichTextEditor에서 <font face="..."> 태그로 설정한 폰트가 우선 적용됨
    return '"Noto Sans KR", sans-serif';
  };

  const getPageBackground = () => {
    if (backgroundColor && backgroundColor !== '#ffffff') return backgroundColor;
    switch (designStyle) {
      case 'retro': return '#fdf6e3';
      case 'playful': return '#fff';
      default: return '#ffffff';
    }
  };

  const getHeaderStyle = () => {
    const base = "text-center mb-8 pb-4 ";
    if (designStyle === 'retro') return base + "border-b-4 border-double";
    if (designStyle === 'playful') return base + "border-b-4 border-dashed rounded-b-3xl";
    return base + "border-b-2"; // modern/minimal
  };

  return (
    <div className="flex flex-col items-center gap-8 py-8 bg-slate-200 overflow-hidden">
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
            minHeight: '1123px',
            padding: '40px 50px',
            boxSizing: 'border-box',
            backgroundColor: getPageBackground(),
            fontFamily: getFontFamily(),
            color: '#1e293b',
            transformOrigin: 'top center',
          }}
        >
          {/* Decorative Elements based on Style */}
          {designStyle === 'retro' && (
            <div className="absolute inset-0 border-[10px] border-double pointer-events-none" style={{ borderColor: themeColor + '40', margin: '15px' }}></div>
          )}
          {designStyle === 'playful' && (
            <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
              <svg width="100" height="100" viewBox="0 0 100 100" fill={themeColor}><circle cx="50" cy="50" r="40" /></svg>
            </div>
          )}

          {pageBlocks.map((block) => (
            <div key={block.id} className="mb-6 relative z-10">

              {block.type === 'header' && (
                <div className={getHeaderStyle()} style={{ borderColor: themeColor }}>
                  <h1 className="text-4xl font-bold mb-2" style={{ color: themeColor }}>{block.content}</h1>
                  <p className="text-sm tracking-widest uppercase opacity-60">Movie Worksheet</p>

                  <div className="mt-6 flex justify-center gap-6 text-sm font-medium opacity-80 flex-wrap">
                    <div className="px-3 py-1 border rounded" style={{ borderColor: themeColor }}>🎬 {block.data?.director}</div>
                    <div className="px-3 py-1 border rounded" style={{ borderColor: themeColor }}>📅 {block.data?.releaseYear}</div>
                    <div className="px-3 py-1 border rounded" style={{ borderColor: themeColor }}>🏷️ {block.data?.genre}</div>
                  </div>

                  {Array.isArray(block.data?.ottProviders) && block.data.ottProviders.length > 0 && (
                    <div className="mt-3 flex justify-center gap-2 text-xs opacity-90 flex-wrap">
                      <span className="opacity-60">📺 시청 가능:</span>
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
              )}

              {block.type === 'text' && (
                <div
                  className="prose max-w-none prose-headings:mb-2 prose-p:my-1"
                  dangerouslySetInnerHTML={{ __html: block.content }}
                />
              )}

              {block.type === 'blank_box' && (
                <div
                  className="w-full rounded-lg bg-white"
                  style={{
                    height: block.height,
                    borderWidth: block.borderStyle === 'none' ? '0' : '2px',
                    borderColor: '#cbd5e1',
                    borderStyle: block.borderStyle || (designStyle === 'playful' ? 'dashed' : 'solid')
                  }}
                />
              )}
            </div>
          ))}

          {/* Page Footer */}
          <div className="absolute bottom-4 left-0 w-full text-center text-xs opacity-40">
            - {pageIndex + 1} -
          </div>
        </div>
        </div>
      ))}
    </div>
  );
};

export default PrintPreview;