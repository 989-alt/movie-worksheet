import React, { useEffect, useRef, useState } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Type, Highlighter, Smile, MinusSquare
} from 'lucide-react';

interface RichTextEditorProps {
  initialContent: string;
  onUpdate: (content: string) => void;
  placeholder?: string;
  themeColor: string;
}

const FONTS = [
  { name: '기본 (Noto Sans)', value: 'Noto Sans KR, sans-serif' },
  { name: '명조 (Nanum Myeongjo)', value: 'Nanum Myeongjo, serif' },
  { name: '손글씨 (Nanum Pen)', value: 'Nanum Pen Script, cursive' },
];

const SIZES = [
  { name: '작게', value: '3' }, // 12pt approx
  { name: '보통', value: '4' }, // 16pt approx
  { name: '크게', value: '5' }, // 24pt approx
  { name: '아주 크게', value: '6' }, // 32pt approx
];

const EMOJIS = ['😊', '⭐', '🎬', '📝', '💡', '❓', '✅', '❌', '🔥', '❤️'];

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  initialContent, 
  onUpdate, 
  placeholder,
  themeColor 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
  }, []); // Run once on mount

  const handleInput = () => {
    if (editorRef.current) {
      onUpdate(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    checkActiveFormats();
  };

  const insertHtml = (html: string) => {
    // Insert HTML at cursor position
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    handleInput(); // Trigger update manually
  };

  const insertBlankBox = () => {
    // Inserts a non-editable inline block that acts as a single character for deletion
    const blankHtml = '<span class="worksheet-blank" contenteditable="false"></span>';
    insertHtml(blankHtml);
  };

  const checkActiveFormats = () => {
    // Simple check to highlight toolbar buttons (imperfect but functional for basic usage)
    const formats = [];
    if (document.queryCommandState('bold')) formats.push('bold');
    if (document.queryCommandState('italic')) formats.push('italic');
    if (document.queryCommandState('underline')) formats.push('underline');
    setActiveFormats(formats);
  };

  const insertEmoji = (emoji: string) => {
    execCommand('insertText', emoji);
    setShowEmojiPicker(false);
  };

  // Prevent focus loss when clicking toolbar buttons
  const preventFocusLoss = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-200 transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 text-slate-600">
        
        {/* Fonts */}
        <select 
          className="h-8 text-xs border border-slate-300 rounded px-1 bg-white focus:outline-none"
          onChange={(e) => execCommand('fontName', e.target.value)}
          defaultValue="Noto Sans KR, sans-serif"
        >
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
        </select>

        {/* Sizes */}
        <select 
          className="h-8 text-xs border border-slate-300 rounded px-1 bg-white focus:outline-none w-16"
          onChange={(e) => execCommand('fontSize', e.target.value)}
          defaultValue="4"
        >
          {SIZES.map(s => <option key={s.value} value={s.value}>{s.name}</option>)}
        </select>

        <div className="w-px h-6 bg-slate-300 mx-1"></div>

        {/* Format Buttons */}
        <button 
          onMouseDown={preventFocusLoss}
          onClick={() => execCommand('bold')}
          className={`p-1.5 rounded hover:bg-slate-200 ${activeFormats.includes('bold') ? 'bg-slate-200 text-blue-600' : ''}`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button 
          onMouseDown={preventFocusLoss}
          onClick={() => execCommand('italic')}
          className={`p-1.5 rounded hover:bg-slate-200 ${activeFormats.includes('italic') ? 'bg-slate-200 text-blue-600' : ''}`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button 
          onMouseDown={preventFocusLoss}
          onClick={() => execCommand('underline')}
          className={`p-1.5 rounded hover:bg-slate-200 ${activeFormats.includes('underline') ? 'bg-slate-200 text-blue-600' : ''}`}
          title="Underline"
        >
          <Underline size={16} />
        </button>

        <div className="w-px h-6 bg-slate-300 mx-1"></div>

        {/* Alignment */}
        <button onMouseDown={preventFocusLoss} onClick={() => execCommand('justifyLeft')} className="p-1.5 rounded hover:bg-slate-200" title="Align Left">
          <AlignLeft size={16} />
        </button>
        <button onMouseDown={preventFocusLoss} onClick={() => execCommand('justifyCenter')} className="p-1.5 rounded hover:bg-slate-200" title="Align Center">
          <AlignCenter size={16} />
        </button>
        <button onMouseDown={preventFocusLoss} onClick={() => execCommand('justifyRight')} className="p-1.5 rounded hover:bg-slate-200" title="Align Right">
          <AlignRight size={16} />
        </button>

        <div className="w-px h-6 bg-slate-300 mx-1"></div>

        {/* Extras */}
        <button 
          onMouseDown={preventFocusLoss}
          onClick={() => execCommand('backColor', '#fef08a')} // Yellow highlight
          className="p-1.5 rounded hover:bg-slate-200 text-yellow-600"
          title="Highlight"
        >
          <Highlighter size={16} />
        </button>

        {/* Insert Blank Box (New Feature) */}
        <button 
          onMouseDown={preventFocusLoss}
          onClick={insertBlankBox} 
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700"
          title="Insert Inline Blank Box"
        >
          <MinusSquare size={16} />
        </button>
        
        {/* Color */}
        <div className="relative group">
          <button onMouseDown={preventFocusLoss} className="p-1.5 rounded hover:bg-slate-200" title="Text Color">
            <Type size={16} style={{ color: themeColor }} />
          </button>
          <div className="absolute top-full left-0 bg-white shadow-lg border rounded p-1 hidden group-hover:flex z-10">
            <button onMouseDown={preventFocusLoss} onClick={() => execCommand('foreColor', '#000000')} className="w-5 h-5 bg-black rounded-sm m-0.5 border"></button>
            <button onMouseDown={preventFocusLoss} onClick={() => execCommand('foreColor', '#ef4444')} className="w-5 h-5 bg-red-500 rounded-sm m-0.5 border"></button>
            <button onMouseDown={preventFocusLoss} onClick={() => execCommand('foreColor', '#3b82f6')} className="w-5 h-5 bg-blue-500 rounded-sm m-0.5 border"></button>
            <button onMouseDown={preventFocusLoss} onClick={() => execCommand('foreColor', '#22c55e')} className="w-5 h-5 bg-green-500 rounded-sm m-0.5 border"></button>
            <button onMouseDown={preventFocusLoss} onClick={() => execCommand('foreColor', themeColor)} className="w-5 h-5 rounded-sm m-0.5 border" style={{backgroundColor: themeColor}}></button>
          </div>
        </div>

        {/* Emoji */}
        <div className="relative">
          <button 
            onMouseDown={preventFocusLoss}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 rounded hover:bg-slate-200 text-amber-500"
            title="Insert Emoji"
          >
            <Smile size={16} />
          </button>
          {showEmojiPicker && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowEmojiPicker(false)}
              ></div>
              <div className="absolute top-full right-0 bg-white shadow-xl border rounded-lg p-2 z-20 grid grid-cols-5 gap-1 w-40">
                {EMOJIS.map(e => (
                  <button 
                    key={e} 
                    onMouseDown={preventFocusLoss}
                    onClick={() => insertEmoji(e)}
                    className="text-xl hover:bg-slate-100 rounded p-1"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onMouseUp={checkActiveFormats}
        onKeyUp={checkActiveFormats}
        className="p-4 min-h-[120px] outline-none prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 cursor-text"
        data-placeholder={placeholder}
        style={{ fontFamily: 'Noto Sans KR, sans-serif' }}
      />
    </div>
  );
};

export default RichTextEditor;