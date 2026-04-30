import React, { useState, useRef } from 'react';
import {
  ActivityType,
  GenerationMode,
  LoadingState,
  MovieFormData,
  WorksheetData,
} from './types';
import MovieForm from './components/MovieForm';
import WorksheetEditor from './components/WorksheetEditor';
import { generateWorksheet } from './services/geminiService';
import { resolveOttForTitle } from './services/ottService';
import { Clapperboard } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [formData, setFormData] = useState<MovieFormData>({
    mode: GenerationMode.SPECIFIC_MOVIE,
    targetAge: 12,
    activityType: ActivityType.CHARACTER_ANALYSIS,
    movieTitle: '',
    ottPlatform: '',
    topic: '',
  });

  const [worksheetData, setWorksheetData] = useState<WorksheetData | null>(null);

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: '',
  });

  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoadingState({ isLoading: false, message: '' });
    setError('작업이 취소되었습니다.');
  };

  // 외부에서 호출 가능한 학습지 생성 함수 (추천 카드 자동 흐름용)
  const handleGenerate = async (
    overrideForm?: Partial<MovieFormData> & { plotSummary?: string }
  ) => {
    const merged = { ...formData, ...(overrideForm || {}) };
    setFormData(merged);

    setLoadingState({ isLoading: true, message: '🎬 AI가 영화를 분석하고 있습니다...' });
    setError(null);
    setWorksheetData(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const data = await generateWorksheet({
        movieTitle: merged.movieTitle,
        targetAge: merged.targetAge,
        activityType: merged.activityType,
        mode: merged.mode,
        topic: merged.topic,
        ottPlatform: merged.ottPlatform,
        plotSummary: merged.plotSummary,
      });

      // OTT providers 비동기 보강 (실패해도 학습지는 생성)
      let ottProviders: WorksheetData['ottProviders'] = [];
      try {
        const ott = await resolveOttForTitle(data.movieTitle || merged.movieTitle || '');
        ottProviders = ott.providers.flatrate;
      } catch {
        ottProviders = [];
      }

      setWorksheetData({
        ...data,
        backgroundColor: merged.backgroundColor,
        ottProviders,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Worksheet generation error:', err);
      setError(err.message || '학습지 생성 중 오류가 발생했습니다.');
    } finally {
      abortControllerRef.current = null;
      setLoadingState({ isLoading: false, message: '' });
    }
  };

  const handleReset = () => {
    setWorksheetData(null);
    setError(null);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FDFBF7] pb-12">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 sticky top-0 z-20 print:hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Clapperboard size={24} />
              </div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">CineEdu</h1>
            </div>
            <div className="text-sm font-medium text-slate-500 hidden sm:block">
              AI 영화 학습지 생성기
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 print:max-w-none print:p-0">
          {loadingState.isLoading && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-lg font-medium text-slate-700">{loadingState.message}</p>
                <p className="text-sm text-slate-500 mt-2">잠시만 기다려주세요...</p>
                <button
                  onClick={handleCancel}
                  className="mt-5 px-6 py-2 text-sm font-medium text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center justify-center font-medium animate-in fade-in slide-in-from-top-2">
              ⚠️ {error}
            </div>
          )}

          {!worksheetData ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] transition-opacity duration-500">
              <div className="text-center mb-10 space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800">
                  <span className="text-blue-600">영화</span>로 배우는<br />
                  즐거운 수업 시간
                </h1>
                <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto">
                  복잡한 준비 없이, 영화 제목만 입력하세요.<br />
                  AI가 맞춤형 토론 질문과 활동지를 10초 만에 만들어드립니다.
                </p>
              </div>
              <MovieForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleGenerate}
                isLoading={loadingState.isLoading}
              />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <WorksheetEditor data={worksheetData} onReset={handleReset} />
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
