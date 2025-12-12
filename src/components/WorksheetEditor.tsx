import React, { useState, useEffect, useRef } from 'react';
import { WorksheetData, EditorBlock } from '../types';
import { 
  Download, Edit3, Eye, Plus, Trash2, GripVertical, Scissors, Square, 
  AlertTriangle, RefreshCw, MoveUp, MoveDown, Type, PenTool
} from 'lucide-react';
import PrintPreview from './PrintPreview';
import RichTextEditor from './RichTextEditor';
import { generatePdfFromPages } from '../utils/pdfGenerator';

interface WorksheetEditorProps {
  data: WorksheetData;
  onReset: () => void;
}

const WorksheetEditor: React.FC<WorksheetEditorProps> = ({ data, onReset }) => {
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const isDroppedOnTrash = useRef(false);

  // Initialize blocks
  useEffect(() => {
    // Generate styled HTML string for themes list
    const themesHtml = `<ul>${data.educationalThemes.map(t => `<li>${t}</li>`).join('')}</ul>`;
    
    // Generate styled HTML string for questions
    const questionsHtml = data.discussionQuestions.map((q, i) => 
      `<div style="background-color: #f8fafc; padding: 10px; border-left: 4px solid ${data.themeColor}; margin-bottom: 8px;"><strong>Q${i+1}.</strong> ${q}</div>`
    ).join('');

    const initialBlocks: EditorBlock[] = [
      {
        id: 'header-main',
        type: 'header',
        content: data.movieTitle,
        data: {
          director: data.director,
          releaseYear: data.releaseYear,
          genre: data.genre,
          ageRating: data.ageRating
        }
      },
      {
        id: 'plot-section',
        type: 'text',
        content: `<h2 style="color: ${data.themeColor}">📝 줄거리</h2><p>${data.plotSummary}</p>`
      },
      {
        id: 'theme-section',
        type: 'text',
        content: `<h2 style="color: ${data.themeColor}">🎓 핵심 주제</h2>${themesHtml}`
      },
      {
        id: 'questions-section',
        type: 'text',
        content: `<h2 style="color: ${data.themeColor}">💬 생각해보기</h2>${questionsHtml}`
      },
      {
        id: 'activity-section-title',
        type: 'text',
        content: `<h2 style="color: ${data.themeColor}">✍️ 심화 활동</h2>${data.activityContent}`
      },
      // Default blank box for activity
      {
        id: 'activity-box',
        type: 'blank_box',
        content: '',
        height: 300,
        borderStyle: 'solid'
      }
    ];
    setBlocks(initialBlocks);
  }, [data]);

  // Block Operations
  const updateBlock = (id: string, updates: Partial<EditorBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const addBlock = (type: 'text' | 'blank_box' | 'page_break', index: number) => {
    const newBlock: EditorBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: type === 'text' ? '<p>새로운 내용을 입력하세요</p>' : '',
      height: type === 'blank_box' ? 150 : undefined,
      borderStyle: type === 'blank_box' ? 'solid' : undefined
    };
    setBlocks(prev => {
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });
  };

  const removeBlockById = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('정말 삭제하시겠습니까?')) {
      setBlocks(prev => prev.filter(b => b.id !== id));
    }
  };

  // Internal remove for DnD (no confirm)
  const deleteBlock = (id: string) => {
     setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    
    setBlocks(prev => {
      const newBlocks = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
      return newBlocks;
    });
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number, id: string) => {
    e.stopPropagation();
    dragItem.current = position;
    isDroppedOnTrash.current = false; // Reset flag
    
    e.dataTransfer.effectAllowed = "move";
    // Store ID to ensure we delete the correct item even if index shifts
    e.dataTransfer.setData('application/json', JSON.stringify({ id, index: position })); 
    
    console.log('Drag started:', position, id);
    
    // Show trash bin
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragOverItem.current = position;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsTrashHovered(false);

    // If successfully dropped on trash, do NOT reorder
    if (isDroppedOnTrash.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const start = dragItem.current;
    const end = dragOverItem.current;
    
    // Only move if valid start/end positions and not dropped on trash
    if (start !== null && end !== null && start !== end) {
      console.log(`Reordering from ${start} to ${end}`);
      setBlocks(prev => {
        const newBlocks = [...prev];
        const item = newBlocks.splice(start, 1)[0];
        newBlocks.splice(end, 0, item);
        return newBlocks;
      });
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Trash Bin Handlers
  const handleTrashDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Allow drop
    e.stopPropagation();
    setIsTrashHovered(true);
  };

  const handleTrashDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsTrashHovered(false);
  };

  const handleTrashDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    isDroppedOnTrash.current = true; // Set flag to prevent DragEnd reorder
    
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const { id } = JSON.parse(dataStr);
        console.log('Dropped on trash. ID:', id);
        if (id) {
          deleteBlock(id);
        }
      } else {
        // Fallback to ref if dataTransfer is empty
        if (dragItem.current !== null && blocks[dragItem.current]) {
          console.log('Dropped on trash (fallback). Index:', dragItem.current);
          deleteBlock(blocks[dragItem.current].id);
        }
      }
    } catch (err) {
      console.error('Error handling trash drop:', err);
    }
    
    // Reset visual states immediately
    setIsDragging(false);
    setIsTrashHovered(false);
    
    // Clear refs
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDownloadPdf = async () => {
    if (viewMode === 'edit') {
      if(confirm("PDF 저장을 위해 미리보기 모드로 전환합니다.")) {
        setViewMode('preview');
        setTimeout(handleDownloadPdf, 500);
      }
      return;
    }
    
    setIsGeneratingPdf(true);
    setTimeout(async () => {
      await generatePdfFromPages('print-preview', `${data.movieTitle}_학습지`);
      setIsGeneratingPdf(false);
    }, 100);
  };

  // Warning for Inappropriate Content
  if (!data.isAppropriate) {
    return (
       <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border-l-8 border-red-500 mt-10">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertTriangle className="text-red-500" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">연령 부적합 경고</h2>
          <p className="text-slate-600 text-lg">
            선택하신 영화 <strong>{data.movieTitle}</strong>은(는) 설정하신 연령대에게 적합하지 않은 것으로 분석되었습니다.
          </p>
          <div className="bg-red-50 p-4 rounded-xl w-full text-left border border-red-100">
            <h3 className="font-bold text-red-700 mb-2">AI 분석 사유:</h3>
            <p className="text-red-600">{data.inappropriateReason}</p>
          </div>
          <button
            onClick={onReset}
            className="mt-4 px-6 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={18} />
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 relative">
      
      {/* Top Control Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 sticky top-4 z-30 flex flex-col md:flex-row justify-between items-center gap-4 backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-4">
           <button onClick={onReset} className="text-slate-500 hover:text-slate-800 font-medium text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            <RefreshCw size={16} /> 새로 만들기
          </button>
          
          {/* Design Badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border" 
               style={{ borderColor: data.themeColor, color: data.themeColor, backgroundColor: `${data.themeColor}10` }}>
            <span className="uppercase">{data.designStyle} Style</span>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('edit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              viewMode === 'edit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Edit3 size={16} /> 편집
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              viewMode === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Eye size={16} /> 미리보기
          </button>
        </div>

        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold shadow-md transition-all text-white
            ${isGeneratingPdf ? 'bg-slate-300 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
          style={{ backgroundColor: isGeneratingPdf ? undefined : data.themeColor }}
        >
          {isGeneratingPdf ? '생성 중...' : <><Download size={18} /> PDF 저장</>}
        </button>
      </div>

      {/* Main Content */}
      {viewMode === 'edit' ? (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
           {blocks.map((block, index) => (
             <div 
                key={block.id} 
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`group relative bg-white border border-slate-200 rounded-xl p-2 md:p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-300 cursor-default`}
             >
                {/* Block Actions Toolbar (Top Right) - HIDDEN VISUALLY BUT FUNCTIONAL */}
                {/* Note: User requested to hide these controls visually. Using display: none to ensure they are hidden. */}
                {block.type !== 'header' && (
                  <div style={{ display: 'none' }} className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white shadow-sm rounded-lg border border-slate-100 p-1 cursor-default">
                    <button onClick={(e) => moveBlock(index, 'up', e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded"><MoveUp size={14} /></button>
                    <button onClick={(e) => moveBlock(index, 'down', e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded"><MoveDown size={14} /></button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button onClick={(e) => removeBlockById(block.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                )}

                {/* Drag Handle (Left) - Explicitly draggable, parent is NOT draggable */}
                {block.type !== 'header' && (
                   <div 
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, index, block.id)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing hover:text-blue-400 p-2 z-20"
                   >
                      <GripVertical size={20} />
                   </div>
                )}
                
                <div className={block.type !== 'header' ? 'pl-8' : ''}>
                  
                  {/* HEADER BLOCK */}
                  {block.type === 'header' && (
                    <div className="text-center py-6 bg-slate-50 rounded-lg border border-slate-100 select-none">
                      <h1 className="text-3xl font-bold text-slate-800 font-serif mb-2">{block.content}</h1>
                      <div className="flex justify-center gap-3 text-sm text-slate-500">
                        <span>{block.data.director}</span>•<span>{block.data.releaseYear}</span>•<span>{block.data.genre}</span>
                      </div>
                      <div className="mt-2 text-xs text-slate-400 uppercase tracking-wider">Header (Fixed)</div>
                    </div>
                  )}

                  {/* TEXT BLOCK */}
                  {block.type === 'text' && (
                    <div className="w-full">
                       <RichTextEditor 
                         initialContent={block.content}
                         onUpdate={(content) => updateBlock(block.id, { content })}
                         themeColor={data.themeColor}
                       />
                    </div>
                  )}

                  {/* BLANK BOX BLOCK */}
                  {block.type === 'blank_box' && (
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                          <Square size={14} /> 빈 박스
                        </div>
                        {/* Border Style Selector */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
                           <button 
                              onClick={() => updateBlock(block.id, { borderStyle: 'solid' })} 
                              className={`p-1 rounded text-xs ${block.borderStyle !== 'dashed' && block.borderStyle !== 'none' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                              title="Solid Border"
                           >
                             <div className="w-4 h-4 border border-current"></div>
                           </button>
                           <button 
                              onClick={() => updateBlock(block.id, { borderStyle: 'dashed' })} 
                              className={`p-1 rounded text-xs ${block.borderStyle === 'dashed' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                              title="Dashed Border"
                           >
                             <div className="w-4 h-4 border border-dashed border-current"></div>
                           </button>
                           <button 
                              onClick={() => updateBlock(block.id, { borderStyle: 'none' })} 
                              className={`p-1 rounded text-xs ${block.borderStyle === 'none' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                              title="No Border"
                           >
                              <div className="w-4 h-4 border border-dotted border-slate-300 opacity-50"></div>
                           </button>
                        </div>
                      </div>

                      <div 
                        className="bg-white rounded-lg relative group/box transition-all"
                        style={{ 
                          height: block.height, 
                          borderWidth: '2px',
                          borderStyle: block.borderStyle === 'none' ? 'dashed' : (block.borderStyle || 'solid'),
                          borderColor: block.borderStyle === 'none' ? '#e2e8f0' : '#cbd5e1'
                        }}
                      >
                         {block.borderStyle === 'none' && (
                           <div className="absolute top-2 left-2 text-xs text-slate-300 pointer-events-none">
                             (Invisible in Preview)
                           </div>
                         )}
                         <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm pointer-events-none opacity-0 group-hover/box:opacity-100 transition-opacity">
                            Drag slider to resize
                         </div>
                         <input 
                           type="range" 
                           min="50" 
                           max="800" 
                           step="10"
                           value={block.height} 
                           onChange={(e) => updateBlock(block.id, { height: parseInt(e.target.value) })}
                           className="absolute bottom-2 right-2 w-32 opacity-0 group-hover/box:opacity-100 transition-opacity cursor-pointer z-10"
                         />
                      </div>
                    </div>
                  )}

                  {/* PAGE BREAK BLOCK */}
                  {block.type === 'page_break' && (
                    <div className="py-6 flex items-center justify-center gap-4 text-orange-500 select-none">
                       <div className="h-px bg-orange-300 flex-1 border-dashed border-t border-orange-300"></div>
                       <div className="flex items-center gap-2 text-xs font-bold bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                         <Scissors size={14} /> PAGE BREAK
                       </div>
                       <div className="h-px bg-orange-300 flex-1 border-dashed border-t border-orange-300"></div>
                    </div>
                  )}
                </div>

                {/* ADD BUTTONS (Bottom of block) */}
                <div className="absolute -bottom-4 left-0 w-full flex justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                   <div className="flex gap-2 bg-white shadow-lg border border-slate-100 rounded-full p-1 pointer-events-auto transform scale-90 hover:scale-100 transition-transform">
                      <button onClick={() => addBlock('text', index)} className="p-1.5 rounded-full hover:bg-blue-50 text-slate-500 hover:text-blue-600" title="Add Text"><Type size={16}/></button>
                      <button onClick={() => addBlock('blank_box', index)} className="p-1.5 rounded-full hover:bg-blue-50 text-slate-500 hover:text-blue-600" title="Add Box"><Square size={16}/></button>
                      <button onClick={() => addBlock('page_break', index)} className="p-1.5 rounded-full hover:bg-orange-50 text-slate-500 hover:text-orange-600" title="Page Break"><Scissors size={16}/></button>
                   </div>
                </div>
             </div>
           ))}
           
           {/* Fallback add buttons if list is empty or at end */}
           <div className="flex justify-center py-8 border-t-2 border-dashed border-slate-200 rounded-xl">
              <div className="flex gap-4">
                  <button onClick={() => addBlock('text', blocks.length)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium">
                    <Plus size={16}/> 텍스트 추가
                  </button>
                  <button onClick={() => addBlock('blank_box', blocks.length)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium">
                    <Plus size={16}/> 빈 박스 추가
                  </button>
              </div>
           </div>
        </div>
      ) : (
        /* PREVIEW MODE */
        <div className="animate-in fade-in slide-in-from-bottom-4">
           <PrintPreview 
             blocks={blocks} 
             themeColor={data.themeColor} 
             designStyle={data.designStyle}
           />
        </div>
      )}

      {/* TRASH CAN DROP ZONE */}
      <div 
        className={`fixed bottom-8 right-8 z-50 transition-all duration-300 transform ${
          isDragging ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
        onDragOver={handleTrashDragOver}
        onDragLeave={handleTrashDragLeave}
        onDrop={handleTrashDrop}
      >
        <div className={`p-6 rounded-full shadow-2xl border-4 flex flex-col items-center justify-center transition-all ${
          isTrashHovered 
            ? 'bg-red-100 border-red-500 text-red-600 scale-110' 
            : 'bg-white border-slate-200 text-slate-400'
        }`}>
          <Trash2 size={32} strokeWidth={isTrashHovered ? 2.5 : 2} />
          <span className={`text-xs font-bold mt-1 ${isTrashHovered ? 'text-red-600' : 'hidden'}`}>
            여기에 드롭하여 삭제
          </span>
        </div>
      </div>

    </div>
  );
};

export default WorksheetEditor;