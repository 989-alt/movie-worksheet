import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { WorksheetData } from '../types';
import { Download, RefreshCw, AlertTriangle, FileText, CheckCircle2, Edit3, Save, X } from 'lucide-react';
import { downloadAsPdf } from '../utils/pdfGenerator';

interface WorksheetPreviewProps {
  data: WorksheetData;
  onReset: () => void;
}

const WorksheetPreview: React.FC<WorksheetPreviewProps> = ({ data: initialData, onReset }) => {
  const [data, setData] = useState<WorksheetData>(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // If inappropriate, show warning screen
  if (!data.isAppropriate) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border-l-8 border-red-500">
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

  const handleDownloadPdf = async () => {
    if (isEditing) {
      alert("편집 모드를 종료한 후 PDF를 저장해주세요.");
      return;
    }
    setIsGeneratingPdf(true);
    // Use a slight delay to allow UI to update if needed
    setTimeout(async () => {
      await downloadAsPdf('worksheet-content', `${data.movieTitle}_학습지`);
      setIsGeneratingPdf(false);
    }, 100);
  };

  const handleChange = (field: keyof WorksheetData, value: any) => {
    setData({ ...data, [field]: value });
  };

  const handleArrayChange = (field: 'educationalThemes' | 'discussionQuestions', index: number, value: string) => {
    const newArray = [...data[field]];
    newArray[index] = value;
    setData({ ...data, [field]: newArray });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100 sticky top-4 z-10 backdrop-blur-md bg-white/90">
        <button
          onClick={onReset}
          className="text-slate-500 hover:text-slate-800 font-medium text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={16} />
          새로 만들기
        </button>
        
        <div className="flex gap-3">
          {isEditing ? (
             <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:bg-green-700 transition-all"
            >
              <Save size={18} />
              편집 완료
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition-all"
            >
              <Edit3 size={18} />
              내용 수정
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || isEditing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold shadow-md transition-all 
              ${isGeneratingPdf || isEditing 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 hover:-translate-y-0.5'
              }`}
          >
            {isGeneratingPdf ? (
              <span className="flex items-center gap-2">
                 <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 PDF 변환 중...
              </span>
            ) : (
              <>
                <Download size={18} />
                PDF 저장
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit Mode Notice */}
      {isEditing && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md animate-in fade-in">
          <div className="flex">
            <div className="flex-shrink-0">
              <Edit3 className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                편집 모드입니다. 내용을 수정하고 <strong>편집 완료</strong> 버튼을 눌러 저장하세요.
                수정된 내용은 PDF에 그대로 반영됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Worksheet Content Area */}
      <div 
        id="worksheet-content" 
        ref={contentRef}
        className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden print:shadow-none print:border-none"
      >
        {/* Header Section */}
        <div className="bg-[#1e3a8a] text-white p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <h1 className="text-3xl font-bold relative z-10 mb-2">{data.movieTitle}</h1>
          <p className="text-blue-200 relative z-10 text-sm tracking-widest uppercase">영화 감상 학습지</p>
        </div>

        <div className="p-8 md:p-12 space-y-10">
          
          {/* Movie Info Grid */}
          <section className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <FileText className="text-blue-500" size={20} />
              영화 정보
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="block text-slate-400 text-xs mb-1">감독</span>
                <span className="font-semibold text-slate-800">{data.director}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs mb-1">개봉년도</span>
                <span className="font-semibold text-slate-800">{data.releaseYear}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs mb-1">장르</span>
                <span className="font-semibold text-slate-800">{data.genre}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs mb-1">등급</span>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                  data.isAppropriate ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {data.ageRating}
                </span>
              </div>
            </div>
          </section>

          {/* Plot */}
          <section>
            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">
              📝 줄거리
            </h2>
            {isEditing ? (
              <textarea 
                value={data.plotSummary}
                onChange={(e) => handleChange('plotSummary', e.target.value)}
                className="w-full p-4 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[150px] text-slate-700"
              />
            ) : (
              <p className="text-slate-700 leading-relaxed text-lg text-justify">
                {data.plotSummary}
              </p>
            )}
          </section>

          {/* Educational Themes */}
          <section>
            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">
              🎓 핵심 주제
            </h2>
            <div className="flex flex-wrap gap-3">
              {data.educationalThemes.map((theme, idx) => (
                <div key={idx} className="flex-1 min-w-[200px]">
                   {isEditing ? (
                     <input 
                      type="text"
                      value={theme}
                      onChange={(e) => handleArrayChange('educationalThemes', idx, e.target.value)}
                      className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-blue-800"
                     />
                   ) : (
                    <span className="bg-blue-50 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold border border-blue-100 flex items-center gap-2 w-full justify-center md:w-auto md:inline-flex">
                      <CheckCircle2 size={16} className="text-blue-500" />
                      {theme}
                    </span>
                   )}
                </div>
              ))}
            </div>
          </section>

          {/* Discussion Questions */}
          <section>
            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">
              💬 생각해보기
            </h2>
            <div className="space-y-4">
              {data.discussionQuestions.map((question, idx) => (
                <div key={idx} className="bg-white border-l-4 border-indigo-400 p-4 shadow-sm rounded-r-lg">
                  {isEditing ? (
                    <div className="flex gap-2 items-start w-full">
                       <span className="font-medium text-indigo-900 text-lg pt-2">Q{idx + 1}.</span>
                       <textarea
                        value={question}
                        onChange={(e) => handleArrayChange('discussionQuestions', idx, e.target.value)}
                        className="w-full p-2 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-900"
                        rows={2}
                       />
                    </div>
                  ) : (
                    <p className="font-medium text-indigo-900 text-lg">Q{idx + 1}. {question}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Main Activity */}
          <section className="print:break-before-page">
            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">
              ✍️ 심화 활동
            </h2>
            <div className="bg-white p-6 rounded-xl border border-dashed border-slate-300 min-h-[400px]">
              {isEditing ? (
                <textarea 
                  value={data.activityContent}
                  onChange={(e) => handleChange('activityContent', e.target.value)}
                  className="w-full h-full min-h-[400px] p-4 font-mono text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Markdown 형식으로 작성하세요..."
                />
              ) : (
                <div className="prose prose-slate prose-lg max-w-none prose-headings:text-blue-800 prose-p:text-slate-700 prose-li:text-slate-700">
                  <ReactMarkdown>{data.activityContent}</ReactMarkdown>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-6 text-center border-t border-slate-200">
          <p className="text-slate-400 text-sm">CineEdu AI가 생성한 교육 자료입니다.</p>
        </div>
      </div>
    </div>
  );
};

export default WorksheetPreview;