import React, { useState, useEffect, useRef } from 'react';
import { WorksheetData, EditorBlock, VocabularyItem } from '../types';
import {
  Download, Edit3, Eye, Plus, Trash2, GripVertical, Scissors, Square,
  AlertTriangle, RefreshCw, MoveUp, MoveDown, Type, BookOpen, CheckSquare,
  Lightbulb, PenLine, GraduationCap, User,
} from 'lucide-react';
import PrintPreview from './PrintPreview';
import RichTextEditor from './RichTextEditor';
import { generatePdfFromPages } from '../utils/pdfGenerator';
import { generatePdfFromBlocks } from '../utils/pdfTextRenderer';

interface WorksheetEditorProps {
  data: WorksheetData;
  onReset: () => void;
}

const DEFAULT_SELF_ASSESSMENT = [
  '이 영화의 핵심 메시지를 이해했나요?',
  '교과서 내용과 영화의 주제를 연결할 수 있나요?',
  '영화에서 배운 내용을 나의 일상에 어떻게 적용할 수 있나요?',
];

const WorksheetEditor: React.FC<WorksheetEditorProps> = ({ data, onReset }) => {
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTrashHovered, setIsTrashHovered] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const isDroppedOnTrash = useRef(false);

  useEffect(() => {
    // Section header style — colored left bar, no emoji
    const sectionH2 = (title: string) =>
      `<h2 style="font-size:18px;font-weight:700;color:#1e293b;border-left:4px solid ${data.themeColor};padding-left:10px;margin-bottom:12px;padding-top:4px;padding-bottom:4px;">${title}</h2>`;

    // Topic chips instead of plain ul
    const themesHtml =
      `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">` +
      data.educationalThemes
        .map(
          (t) =>
            `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${data.themeColor}18;color:${data.themeColor};font-size:13px;font-weight:600;border:1px solid ${data.themeColor}30;">${t}</span>`
        )
        .join('') +
      `</div>`;

    // Discussion questions with word-count hint
    const questionsHtml = data.discussionQuestions
      .map(
        (q, i) =>
          `<div style="background:#f8fafc;padding:12px 14px;border-left:4px solid ${data.themeColor};margin-bottom:10px;border-radius:0 6px 6px 0;">` +
          `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">` +
          `<strong style="color:${data.themeColor};">Q${i + 1}.</strong>` +
          `<span style="flex:1;color:#1e293b;font-size:14px;">${q}</span>` +
          `<span style="font-size:11px;color:#94a3b8;white-space:nowrap;flex-shrink:0;">2~3문장</span>` +
          `</div></div>`
      )
      .join('');

    const initialBlocks: EditorBlock[] = [
      // 1. Header
      {
        id: 'header-main',
        type: 'header',
        content: data.movieTitle,
        data: {
          director: data.director,
          releaseYear: data.releaseYear,
          genre: data.genre,
          ageRating: data.ageRating,
          ottProviders: data.ottProviders || [],
        },
      },
      // 2. 시청 전 예측
      {
        id: 'prediction-section',
        type: 'prediction_box',
        content: data.prediction || '제목과 영화 정보를 보고 시청 전에 어떤 내용일지 예측해보세요.',
        height: 110,
      },
      // 3. 핵심 어휘
      {
        id: 'vocab-section',
        type: 'vocabulary_table',
        content: '',
        data: { items: data.vocabulary || [] },
      },
      // 4. 줄거리
      {
        id: 'plot-section',
        type: 'text',
        content:
          sectionH2('줄거리') +
          `<p style="font-size:14px;line-height:1.75;color:#374151;">${data.plotSummary}</p>`,
      },
      // 5. 핵심 주제
      {
        id: 'theme-section',
        type: 'text',
        content: sectionH2('핵심 주제') + themesHtml,
      },
      // 6. 생각해보기
      {
        id: 'questions-section',
        type: 'text',
        content:
          sectionH2('생각해보기') +
          questionsHtml +
          `<div style="height:200px;border:2px solid #cbd5e1;border-radius:8px;background:#f8fafc;background-image:repeating-linear-gradient(to bottom,transparent,transparent calc(8mm - 1px),#e2e8f0 calc(8mm - 1px),#e2e8f0 8mm);margin-top:8px;"></div>`,
      },
      // 7. 심화 활동
      {
        id: 'activity-section',
        type: 'text',
        content: sectionH2('심화 활동') + data.activityContent,
      },
      {
        id: 'activity-box',
        type: 'blank_box',
        content: '',
        height: 160,
        borderStyle: 'solid',
        label: '토론 메모',
        lined: true,
      },
      // 8. 한 줄 평
      {
        id: 'one-liner-section',
        type: 'one_liner',
        content: data.oneLineReview || '이 영화를 한 문장으로 표현한다면?',
      },
      // 9. 자기평가
      {
        id: 'self-assessment-section',
        type: 'self_assessment',
        content: '',
        data: { items: data.selfAssessment || DEFAULT_SELF_ASSESSMENT },
      },
    ];
    setBlocks(initialBlocks);
  }, [data]);

  const updateBlock = (id: string, updates: Partial<EditorBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const addBlock = (type: 'text' | 'blank_box' | 'page_break', index: number) => {
    const newBlock: EditorBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: type === 'text' ? '<p>새로운 내용을 입력하세요</p>' : '',
      height: type === 'blank_box' ? 150 : undefined,
      borderStyle: type === 'blank_box' ? 'solid' : undefined,
    };
    setBlocks((prev) => {
      const arr = [...prev];
      arr.splice(index + 1, 0, newBlock);
      return arr;
    });
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const removeBlockById = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmDeleteId(id);
  };
  const confirmRemoveBlock = () => {
    if (confirmDeleteId) {
      setBlocks((prev) => prev.filter((b) => b.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    }
  };
  const deleteBlock = (id: string) => setBlocks((prev) => prev.filter((b) => b.id !== id));

  const moveBlock = (index: number, direction: 'up' | 'down', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    setBlocks((prev) => {
      const arr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number, id: string) => {
    e.stopPropagation();
    dragItem.current = position;
    isDroppedOnTrash.current = false;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ id, index: position }));
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
    if (isDroppedOnTrash.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    const start = dragItem.current;
    const end = dragOverItem.current;
    if (start !== null && end !== null && start !== end) {
      setBlocks((prev) => {
        const arr = [...prev];
        const item = arr.splice(start, 1)[0];
        arr.splice(end, 0, item);
        return arr;
      });
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleTrashDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
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
    isDroppedOnTrash.current = true;
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const { id } = JSON.parse(dataStr);
        if (id) deleteBlock(id);
      } else if (dragItem.current !== null && blocks[dragItem.current]) {
        deleteBlock(blocks[dragItem.current].id);
      }
    } catch (err) {
      console.error('Trash drop error:', err);
    }
    setIsDragging(false);
    setIsTrashHovered(false);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const [pdfMode, setPdfMode] = useState<'text' | 'image'>('text');
  const [audience, setAudience] = useState<'student' | 'teacher'>('student');
  const [pendingPdf, setPendingPdf] = useState(false);

  const handleDownloadPdf = () => {
    if (pdfMode === 'text') {
      triggerTextPdf();
      return;
    }
    // image mode needs preview rendered
    if (viewMode === 'edit') {
      setPendingPdf(true);
      setViewMode('preview');
      return;
    }
    triggerImagePdf();
  };

  const triggerTextPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generatePdfFromBlocks(blocks, data.themeColor, {
        audience,
        fileName: data.movieTitle + '_학습지',
      });
    } catch (err) {
      console.error('[Text PDF Error]:', err);
      alert('텍스트 PDF 생성 실패. 이미지 모드로 전환해 다시 시도해 주세요.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const triggerImagePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generatePdfFromPages('print-preview', `${data.movieTitle}_학습지`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'preview' && pendingPdf) {
      setPendingPdf(false);
      requestAnimationFrame(() => requestAnimationFrame(triggerImagePdf));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, pendingPdf]);

  if (!data.isAppropriate) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border-l-8 border-red-500 mt-10">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertTriangle className="text-red-500" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">연령 부적합 경고</h2>
          <p className="text-slate-600 text-lg">
            선택하신 영화 <strong>{data.movieTitle}</strong>은(는) 설정하신 연령대에게 적합하지 않은 것으로
            분석되었습니다.
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
          <button
            onClick={onReset}
            className="text-slate-500 hover:text-slate-800 font-medium text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={16} /> 새로 만들기
          </button>
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border"
            style={{ borderColor: data.themeColor, color: data.themeColor, backgroundColor: `${data.themeColor}10` }}
          >
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

        {/* PDF 옵션 + 다운로드 */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* 학생/교사 토글 */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setAudience('student')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium transition-all ${
                audience === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              <User size={13} /> 학생
            </button>
            <button
              onClick={() => setAudience('teacher')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium transition-all ${
                audience === 'teacher' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              <GraduationCap size={13} /> 교사
            </button>
          </div>
          {/* 텍스트/이미지 모드 토글 */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setPdfMode('text')}
              title="텍스트 PDF — 검색 가능, 소용량"
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                pdfMode === 'text' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              텍스트 PDF
            </button>
            <button
              onClick={() => setPdfMode('image')}
              title="이미지 PDF — 레이아웃 그대로 캡처"
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                pdfMode === 'image' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              이미지 PDF
            </button>
          </div>
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold shadow-md transition-all text-white ${
              isGeneratingPdf ? 'bg-slate-300 cursor-not-allowed' : 'hover:-translate-y-0.5'
            }`}
            style={{ backgroundColor: isGeneratingPdf ? undefined : data.themeColor }}
          >
            {isGeneratingPdf ? '생성 중...' : <><Download size={16} /> PDF</>}
          </button>
        </div>
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
              className="group relative bg-white border border-slate-200 rounded-xl p-2 md:p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-300 cursor-default"
            >
              {/* Block Actions */}
              {block.type !== 'header' && (
                <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white shadow-sm rounded-lg border border-slate-100 p-1">
                  <button onClick={(e) => moveBlock(index, 'up', e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded">
                    <MoveUp size={14} />
                  </button>
                  <button onClick={(e) => moveBlock(index, 'down', e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded">
                    <MoveDown size={14} />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button onClick={(e) => removeBlockById(block.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {/* Drag Handle */}
              {block.type !== 'header' && (
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index, block.id)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing hover:text-blue-400 p-2 z-20"
                >
                  <GripVertical size={20} />
                </div>
              )}

              <div className={block.type !== 'header' ? 'pl-8' : ''}>

                {/* HEADER */}
                {block.type === 'header' && (
                  <div className="text-center py-6 bg-slate-50 rounded-lg border border-slate-100 select-none">
                    <h1 className="text-3xl font-bold text-slate-800 font-serif mb-2">{block.content}</h1>
                    <div className="flex justify-center gap-3 text-sm text-slate-500">
                      <span>{block.data?.director}</span>•<span>{block.data?.releaseYear}</span>•<span>{block.data?.genre}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-400 uppercase tracking-wider">Header (Fixed)</div>
                  </div>
                )}

                {/* TEXT */}
                {block.type === 'text' && (
                  <div className="w-full">
                    <RichTextEditor
                      initialContent={block.content}
                      onUpdate={(content) => updateBlock(block.id, { content })}
                      themeColor={data.themeColor}
                    />
                  </div>
                )}

                {/* BLANK BOX */}
                {block.type === 'blank_box' && (
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                        <Square size={14} />
                        {block.label ? (
                          <input
                            className="border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-600 focus:outline-none focus:border-blue-400"
                            value={block.label}
                            onChange={(e) => updateBlock(block.id, { label: e.target.value })}
                            placeholder="레이블"
                          />
                        ) : (
                          <span>빈 박스</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!block.lined}
                            onChange={(e) => updateBlock(block.id, { lined: e.target.checked })}
                            className="rounded"
                          />
                          줄선
                        </label>
                        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
                          <button
                            onClick={() => updateBlock(block.id, { borderStyle: 'solid' })}
                            className={`p-1 rounded text-xs ${block.borderStyle !== 'dashed' && block.borderStyle !== 'none' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            <div className="w-4 h-4 border border-current" />
                          </button>
                          <button
                            onClick={() => updateBlock(block.id, { borderStyle: 'dashed' })}
                            className={`p-1 rounded text-xs ${block.borderStyle === 'dashed' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            <div className="w-4 h-4 border border-dashed border-current" />
                          </button>
                          <button
                            onClick={() => updateBlock(block.id, { borderStyle: 'none' })}
                            className={`p-1 rounded text-xs ${block.borderStyle === 'none' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            <div className="w-4 h-4 border border-dotted border-slate-300 opacity-50" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div
                      className="bg-white rounded-lg relative group/box transition-all"
                      style={{
                        height: block.height,
                        borderWidth: '2px',
                        borderStyle: block.borderStyle === 'none' ? 'dashed' : (block.borderStyle || 'solid'),
                        borderColor: block.borderStyle === 'none' ? '#e2e8f0' : '#cbd5e1',
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

                {/* PAGE BREAK */}
                {block.type === 'page_break' && (
                  <div className="py-6 flex items-center justify-center gap-4 text-orange-500 select-none">
                    <div className="h-px bg-orange-300 flex-1 border-dashed border-t border-orange-300" />
                    <div className="flex items-center gap-2 text-xs font-bold bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                      <Scissors size={14} /> PAGE BREAK
                    </div>
                    <div className="h-px bg-orange-300 flex-1 border-dashed border-t border-orange-300" />
                  </div>
                )}

                {/* PREDICTION BOX */}
                {block.type === 'prediction_box' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-2">
                      <Lightbulb size={16} />
                      시청 전 예측
                    </div>
                    <p className="text-xs text-amber-600 mb-2">안내 문구:</p>
                    <input
                      className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-amber-400 mb-2"
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    />
                    <div className="text-xs text-amber-500">
                      높이:
                      <input
                        type="range"
                        min="60"
                        max="300"
                        step="10"
                        value={block.height || 110}
                        onChange={(e) => updateBlock(block.id, { height: parseInt(e.target.value) })}
                        className="ml-2 w-28 align-middle"
                      />
                      {block.height || 110}px
                    </div>
                  </div>
                )}

                {/* VOCABULARY TABLE */}
                {block.type === 'vocabulary_table' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-3">
                      <BookOpen size={16} />
                      핵심 어휘 — {(block.data?.items || []).length}개
                    </div>
                    {(block.data?.items || []).length === 0 ? (
                      <p className="text-xs text-emerald-500 italic">
                        어휘 데이터 없음 — AI 응답에 vocabulary 필드가 포함되지 않았습니다.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {(block.data.items as VocabularyItem[]).map((item, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm bg-white rounded-lg px-3 py-2 border border-emerald-100">
                            <span className="font-semibold text-emerald-800 w-24 flex-shrink-0">{item.word}</span>
                            <span className="text-xs text-slate-400 flex-1 truncate">{item.definition}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-emerald-500 mt-2">
                      학생용 출력물에는 오른쪽 칸(뜻)이 비어 있습니다.
                    </p>
                  </div>
                )}

                {/* ONE LINER */}
                {block.type === 'one_liner' && (
                  <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                    <div className="flex items-center gap-2 text-violet-700 font-bold text-sm mb-2">
                      <PenLine size={16} />
                      시청 후 한 줄 평
                    </div>
                    <p className="text-xs text-violet-500 mb-2">안내 문구:</p>
                    <input
                      className="w-full text-sm border border-violet-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-violet-400"
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    />
                  </div>
                )}

                {/* SELF ASSESSMENT */}
                {block.type === 'self_assessment' && (
                  <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
                    <div className="flex items-center gap-2 text-sky-700 font-bold text-sm mb-3">
                      <CheckSquare size={16} />
                      자기평가 체크리스트 (○△×)
                    </div>
                    <div className="space-y-2">
                      {(block.data?.items || DEFAULT_SELF_ASSESSMENT).map((item: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-sky-100">
                          <span className="text-xs font-bold text-sky-400 w-5 flex-shrink-0">{i + 1}.</span>
                          <span className="text-sm text-slate-700 flex-1">{item}</span>
                          <div className="flex gap-1 text-xs text-slate-300 flex-shrink-0">
                            {['○', '△', '×'].map((s) => (
                              <span key={s} className="border border-slate-200 rounded-full w-5 h-5 flex items-center justify-center">{s}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-sky-400 mt-2">항목 수 고정 (3개)</p>
                  </div>
                )}
              </div>

              {/* Add Buttons */}
              <div className="absolute -bottom-4 left-0 w-full flex justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                <div className="flex gap-2 bg-white shadow-lg border border-slate-100 rounded-full p-1 pointer-events-auto transform scale-90 hover:scale-100 transition-transform">
                  <button onClick={() => addBlock('text', index)} className="p-1.5 rounded-full hover:bg-blue-50 text-slate-500 hover:text-blue-600" title="텍스트 추가">
                    <Type size={16} />
                  </button>
                  <button onClick={() => addBlock('blank_box', index)} className="p-1.5 rounded-full hover:bg-blue-50 text-slate-500 hover:text-blue-600" title="빈 박스 추가">
                    <Square size={16} />
                  </button>
                  <button onClick={() => addBlock('page_break', index)} className="p-1.5 rounded-full hover:bg-orange-50 text-slate-500 hover:text-orange-600" title="페이지 나누기">
                    <Scissors size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-center py-8 border-t-2 border-dashed border-slate-200 rounded-xl">
            <div className="flex gap-4">
              <button
                onClick={() => addBlock('text', blocks.length)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
              >
                <Plus size={16} /> 텍스트 추가
              </button>
              <button
                onClick={() => addBlock('blank_box', blocks.length)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
              >
                <Plus size={16} /> 빈 박스 추가
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <PrintPreview
            blocks={blocks}
            themeColor={data.themeColor}
            designStyle={data.designStyle}
            backgroundColor={data.backgroundColor}
          />
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl text-center space-y-4">
            <Trash2 className="mx-auto text-red-500" size={32} />
            <p className="text-lg font-medium text-slate-800">이 블록을 삭제하시겠습니까?</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-5 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium"
              >
                취소
              </button>
              <button
                onClick={confirmRemoveBlock}
                className="px-5 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Drop Zone */}
      <div
        className={`fixed bottom-8 right-8 z-50 transition-all duration-300 transform ${
          isDragging ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
        onDragOver={handleTrashDragOver}
        onDragLeave={handleTrashDragLeave}
        onDrop={handleTrashDrop}
      >
        <div
          className={`p-6 rounded-full shadow-2xl border-4 flex flex-col items-center justify-center transition-all ${
            isTrashHovered
              ? 'bg-red-100 border-red-500 text-red-600 scale-110'
              : 'bg-white border-slate-200 text-slate-400'
          }`}
        >
          <Trash2 size={32} strokeWidth={isTrashHovered ? 2.5 : 2} />
          {isTrashHovered && (
            <span className="text-xs font-bold mt-1 text-red-600">여기에 드롭하여 삭제</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorksheetEditor;
