import React from 'react';
import { EditorBlock, DesignStyle } from '../types';

interface PrintPreviewProps {
  blocks: EditorBlock[];
  previewId?: string;
  themeColor: string;
  designStyle: DesignStyle;
}

const PrintPreview: React.FC<PrintPreviewProps> = ({ 
  blocks, 
  previewId = 'print-preview',
  themeColor,
  designStyle
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

  // Design Helpers
  const getFontFamily = () => {
    switch (designStyle) {
      case 'retro': return '"Nanum Myeongjo", serif';
      case 'playful': return '"Nanum Pen Script", cursive'; // Hand-written feel
      case 'minimal': return '"Noto Sans KR", sans-serif'; // Clean
      default: return '"Noto Sans KR", sans-serif'; // Modern default
    }
  };

  const getPageBackground = () => {
    switch (designStyle) {
      case 'retro': return '#fdf6e3'; // Warm paper
      case 'playful': return '#fff'; // White with colorful accents
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
    <div className="flex flex-col items-center gap-8 py-8 bg-slate-200 overflow-auto">
      {pages.map((pageBlocks, pageIndex) => (
        <div
          key={pageIndex}
          className={`a4-page-container shadow-2xl mx-auto relative ${previewId}`}
          style={{
            width: '794px', // A4 width at 96 DPI
            minHeight: '1123px', // A4 height
            padding: '40px 50px',
            boxSizing: 'border-box',
            backgroundColor: getPageBackground(),
            fontFamily: getFontFamily(),
            color: '#1e293b'
          }}
        >
          {/* Decorative Elements based on Style */}
          {designStyle === 'retro' && (
            <div className="absolute inset-0 border-[10px] border-double pointer-events-none" style={{ borderColor: themeColor + '40', margin: '15px' }}></div>
          )}
          {designStyle === 'playful' && (
             <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
               <svg width="100" height="100" viewBox="0 0 100 100" fill={themeColor}><circle cx="50" cy="50" r="40"/></svg>
             </div>
          )}

          {pageBlocks.map((block) => (
            <div key={block.id} className="mb-6 relative z-10">
              
              {block.type === 'header' && (
                <div className={getHeaderStyle()} style={{ borderColor: themeColor }}>
                  <h1 className="text-4xl font-bold mb-2" style={{ color: themeColor }}>{block.content}</h1>
                  <p className="text-sm tracking-widest uppercase opacity-60">Movie Worksheet</p>
                  
                  <div className="mt-6 flex justify-center gap-6 text-sm font-medium opacity-80">
                     <div className="px-3 py-1 border rounded" style={{borderColor: themeColor}}>🎬 {block.data?.director}</div>
                     <div className="px-3 py-1 border rounded" style={{borderColor: themeColor}}>📅 {block.data?.releaseYear}</div>
                     <div className="px-3 py-1 border rounded" style={{borderColor: themeColor}}>🏷️ {block.data?.genre}</div>
                  </div>
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
      ))}
    </div>
  );
};

export default PrintPreview;