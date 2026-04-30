import React, { useState } from 'react';
import { Youtube, Loader2, CheckCircle, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import {
  classifyYouTube,
  isValidYouTubeUrl,
  YouTubeClassification,
  GRADE_LABELS,
  GRADE_AGE_DEFAULT,
} from '../services/youtubeService';

interface YouTubeModeProps {
  onConfirm: (classification: YouTubeClassification) => void;
  isParentLoading: boolean;
}

const YouTubeMode: React.FC<YouTubeModeProps> = ({ onConfirm, isParentLoading }) => {
  const [url, setUrl] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [classification, setClassification] = useState<YouTubeClassification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setError(null);
    setClassification(null);

    if (!isValidYouTubeUrl(url)) {
      setError('유효한 YouTube 링크가 아닙니다. (예: https://www.youtube.com/watch?v=...)');
      return;
    }

    setIsClassifying(true);
    try {
      const result = await classifyYouTube(url);
      setClassification(result);
    } catch (e: any) {
      setError(e.message || '영상 분석에 실패했습니다.');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleReset = () => {
    setClassification(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-xl border border-red-100">
        <div className="flex items-start gap-3">
          <Youtube className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
          <div className="text-sm text-red-800">
            <p className="font-bold mb-1">YouTube 영상으로 학습지 만들기</p>
            <p>
              링크를 붙여넣으면 AI가 영상을 시청하고 학년대 적합성을 판정합니다. 적합한 경우 바로 학습지로 만들 수 있습니다.
            </p>
            <p className="mt-1 text-xs opacity-80">
              ※ 30분 이하·공개·연령제한 없음 영상 권장. 자막이 있으면 정확도가 높아집니다.
            </p>
          </div>
        </div>
      </div>

      {/* URL Input */}
      {!classification && (
        <>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">YouTube 링크</label>
            <div className="relative">
              <Youtube className="absolute left-3 top-3 text-red-500" size={20} />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isClassifying || !url}
            className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
              ${
                isClassifying || !url
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
          >
            {isClassifying ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                AI가 영상을 시청·분석하는 중... (최대 1분)
              </>
            ) : (
              <>
                <Sparkles size={18} />
                영상 적합성 분석
              </>
            )}
          </button>
        </>
      )}

      {/* Classification Result */}
      {classification && (
        <div className="space-y-3">
          {classification.isAppropriate ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle className="text-emerald-600 mt-1 flex-shrink-0" size={22} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      적합 학년대
                    </span>
                    {classification.fitGrades.map((g) => (
                      <span
                        key={g}
                        className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-xs font-bold"
                      >
                        {GRADE_LABELS[g]}
                      </span>
                    ))}
                  </div>
                  <h4 className="font-bold text-slate-800 mt-2 leading-snug">{classification.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{classification.channel}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold text-slate-700">📝 영상 요약</span>
                  <p className="text-slate-600 mt-1">{classification.summary}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">🎯 학년대 판단 근거</span>
                  <p className="text-slate-600 mt-1">{classification.ageJustification}</p>
                </div>
                {classification.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {classification.topics.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-700 text-xs"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <RefreshCw size={14} /> 다른 영상
                </button>
                <button
                  type="button"
                  onClick={() => onConfirm(classification)}
                  disabled={isParentLoading}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-lg
                    ${
                      isParentLoading
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                >
                  {isParentLoading ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <>
                      이 영상으로 학습지 생성
                      <span className="opacity-70">
                        ({GRADE_AGE_DEFAULT[classification.primaryGrade]}세 기준)
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-600 mt-1 flex-shrink-0" size={22} />
                <div className="flex-1">
                  <p className="font-bold text-red-800">학습 자료로 부적합한 영상입니다</p>
                  <p className="text-sm text-red-700 mt-2">
                    {classification.inappropriateReason ||
                      '폭력성·선정성·욕설·약물·증오발언 등 학생용 자료로 적절하지 않은 요소가 감지되었습니다.'}
                  </p>
                  {classification.title && (
                    <p className="text-xs text-red-600 mt-2 opacity-80">
                      영상: {classification.title} ({classification.channel})
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100"
                  >
                    <RefreshCw size={14} /> 다른 영상으로 시도
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default YouTubeMode;
