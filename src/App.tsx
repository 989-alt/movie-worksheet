import React, { useState } from 'react';
import { ActivityType, GenerationMode, LoadingState, MovieFormData, WorksheetData } from './types';
import MovieForm from './components/MovieForm';
import WorksheetEditor from './components/WorksheetEditor';
import { generateWorksheet } from './services/geminiService';
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

  const handleSubmit = async () => {
    setLoadingState({ isLoading: true, message: 'AI가 영화를 분석하고 있습니다...' });
    setError(null);
    setWorksheetData(null);

    try {
      const data = await generateWorksheet(formData);
      setWorksheetData(data);
    } catch (err: any) {
      console.error("Worksheet generation error:", err);
      setError(err.message || '학습지 생성 중 오류가 발생했습니다.');
    } finally {
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
              AI Movie Worksheet Generator
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 print:max-w-none print:p-0">
          
          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center justify-center font-medium animate-in fade-in slide-in-from-top-2">
              ⚠️ {error}
            </div>
          )}

          {/* View Switcher: Form or Result */}
          {!worksheetData ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] transition-opacity duration-500">
              <div className="text-center mb-10 space-y-3">
                  <h1 className="text-4xl md:text-5xl font-bold text-slate-800">
                    <span className="text-blue-600">영화</span>로 배우는<br />
                    즐거운 수업 시간
                  </h1>
                  <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto">
                    복잡한 준비 없이, 영화 제목만 입력하세요.<br/>
                    AI가 맞춤형 토론 질문과 활동지를 10초 만에 만들어드립니다.
                  </p>
              </div>
              <MovieForm 
                formData={formData} 
                setFormData={setFormData} 
                onSubmit={handleSubmit}
                isLoading={loadingState.isLoading}
              />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <WorksheetEditor 
                data={worksheetData} 
                onReset={handleReset} 
              />
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;