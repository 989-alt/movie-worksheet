import React from 'react';
import { ActivityType, GenerationMode, MovieFormData } from '../types';
import { Film, Lightbulb, Search, Settings2 } from 'lucide-react';

interface MovieFormProps {
  formData: MovieFormData;
  setFormData: React.Dispatch<React.SetStateAction<MovieFormData>>;
  onSubmit: () => void;
  isLoading: boolean;
}

const MovieForm: React.FC<MovieFormProps> = ({ formData, setFormData, onSubmit, isLoading }) => {
  const handleChange = (field: keyof MovieFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-2xl mx-auto border border-stone-100">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">학습지 생성 설정</h2>
        <p className="text-slate-500 text-sm">AI가 영화를 분석하여 맞춤형 교육 자료를 만듭니다.</p>
      </div>

      {/* Mode Selection Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
        <button
          onClick={() => handleChange('mode', GenerationMode.SPECIFIC_MOVIE)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
            formData.mode === GenerationMode.SPECIFIC_MOVIE
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Search size={18} />
          영화 직접 선택
        </button>
        <button
          onClick={() => handleChange('mode', GenerationMode.RECOMMENDATION)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
            formData.mode === GenerationMode.RECOMMENDATION
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Lightbulb size={18} />
          AI 영화 추천
        </button>
      </div>

      <div className="space-y-6">
        {/* Dynamic Inputs based on Mode */}
        {formData.mode === GenerationMode.SPECIFIC_MOVIE ? (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">영화 제목</label>
            <div className="relative">
              <Film className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="text"
                value={formData.movieTitle || ''}
                onChange={(e) => handleChange('movieTitle', e.target.value)}
                placeholder="예: 인사이드 아웃, 기생충"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">OTT 플랫폼</label>
              <input
                type="text"
                value={formData.ottPlatform || ''}
                onChange={(e) => handleChange('ottPlatform', e.target.value)}
                placeholder="예: Netflix, Disney+"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">관심 주제/테마</label>
              <input
                type="text"
                value={formData.topic || ''}
                onChange={(e) => handleChange('topic', e.target.value)}
                placeholder="예: 우정, 환경 보호"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Age Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">대상 연령 (만 나이)</label>
            <input
              type="number"
              min="5"
              max="19"
              value={formData.targetAge}
              onChange={(e) => handleChange('targetAge', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">입력한 나이에 맞춰 유해성을 검사합니다.</p>
          </div>

          {/* Activity Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">활동 유형</label>
            <div className="relative">
              <Settings2 className="absolute left-3 top-3 text-slate-400" size={20} />
              <select
                value={formData.activityType}
                onChange={(e) => handleChange('activityType', e.target.value as ActivityType)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
              >
                {Object.values(ActivityType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={onSubmit}
          disabled={isLoading || (formData.mode === GenerationMode.SPECIFIC_MOVIE && !formData.movieTitle)}
          className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2
            ${isLoading 
              ? 'bg-slate-300 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30'
            }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              AI 분석 및 생성 중...
            </>
          ) : (
            '학습지 만들기'
          )}
        </button>
      </div>
    </div>
  );
};

export default MovieForm;
