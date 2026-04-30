import React, { useState, useRef } from 'react';
import { ActivityType, GenerationMode, MovieFormData } from '../types';
import { searchMulti, TMDBResult } from '../services/tmdb';
import { recommendMovies, MovieRecommendation } from '../services/geminiService';
import {
  Film,
  Lightbulb,
  Search,
  Settings2,
  Loader2,
  CheckCircle,
  Palette,
  Sparkles,
  Youtube,
} from 'lucide-react';
import MovieRecommendCard from './MovieRecommendCard';
import YouTubeMode from './YouTubeMode';
import type { YouTubeClassification } from '../services/youtubeService';

interface MovieFormProps {
  formData: MovieFormData;
  setFormData: React.Dispatch<React.SetStateAction<MovieFormData>>;
  onSubmit: (override?: Partial<MovieFormData>) => void | Promise<void>;
  onSubmitVideo?: (classification: YouTubeClassification) => void | Promise<void>;
  isLoading: boolean;
}

const BACKGROUND_COLORS = [
  { name: '화이트', value: '#ffffff' },
  { name: '크림', value: '#fffdf7' },
  { name: '라벤더', value: '#f5f3ff' },
  { name: '민트', value: '#f0fdfa' },
  { name: '피치', value: '#fff7ed' },
  { name: '스카이', value: '#f0f9ff' },
];

const MovieForm: React.FC<MovieFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  onSubmitVideo,
  isLoading,
}) => {
  const [suggestions, setSuggestions] = useState<TMDBResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recommendations, setRecommendations] = useState<MovieRecommendation[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendError, setRecommendError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = <K extends keyof MovieFormData>(field: K, value: MovieFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (
      field === 'movieTitle' &&
      formData.mode === GenerationMode.SPECIFIC_MOVIE &&
      typeof value === 'string'
    ) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

      if (!value || value.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchMulti(value);
        setSuggestions(results.slice(0, 5));
        setShowSuggestions(true);
      }, 500);
    }
  };

  const handleSelectMovie = (movie: TMDBResult) => {
    const title = movie.title || movie.name || '';
    setFormData((prev) => ({ ...prev, movieTitle: title }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleGetRecommendations = async () => {
    if (!formData.topic) {
      setRecommendError('관심 주제를 입력해주세요.');
      return;
    }
    setRecommendError(null);
    setIsRecommending(true);
    try {
      const recs = await recommendMovies(
        formData.topic,
        formData.ottPlatform,
        formData.targetAge
      );
      if (recs.length === 0) {
        setRecommendError('추천 결과가 없습니다. 주제를 바꿔서 다시 시도해주세요.');
      } else {
        setRecommendations(recs);
      }
    } catch (e) {
      console.error(e);
      setRecommendError('추천을 가져오는데 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsRecommending(false);
    }
  };

  // 추천 카드 클릭 → 모드 전환 + 즉시 학습지 생성 트리거 (자동 흐름)
  const handleSelectRecommendation = (rec: MovieRecommendation) => {
    onSubmit({
      mode: GenerationMode.SPECIFIC_MOVIE,
      movieTitle: rec.title,
      plotSummary: rec.plotSummary,
    });
  };

  const handleSubmit = () => {
    if (formData.mode === GenerationMode.RECOMMENDATION && recommendations.length === 0) {
      handleGetRecommendations();
    } else {
      onSubmit();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-2xl mx-auto border border-stone-100">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">학습지 생성 설정</h2>
        <p className="text-slate-500 text-sm">AI가 영화를 분석하여 맞춤형 교육 자료를 만듭니다.</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-8 flex-wrap gap-1">
        <button
          onClick={() => {
            handleChange('mode', GenerationMode.SPECIFIC_MOVIE);
            setRecommendations([]);
          }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
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
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
            formData.mode === GenerationMode.RECOMMENDATION
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Lightbulb size={18} />
          AI 영화 추천
        </button>
        <button
          onClick={() => {
            handleChange('mode', GenerationMode.YOUTUBE);
            setRecommendations([]);
          }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
            formData.mode === GenerationMode.YOUTUBE
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Youtube size={18} />
          YouTube 링크
        </button>
      </div>

      <div className="space-y-6">
        {/* === SPECIFIC MOVIE MODE === */}
        {formData.mode === GenerationMode.SPECIFIC_MOVIE && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">영화 제목</label>
            <div className="relative">
              <Film className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="text"
                value={formData.movieTitle || ''}
                onChange={(e) => handleChange('movieTitle', e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="예: 인사이드 아웃, 기생충"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((movie) => (
                    <div
                      key={movie.id}
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center gap-3"
                      onClick={() => handleSelectMovie(movie)}
                    >
                      {movie.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                          alt={movie.title || movie.name}
                          className="w-10 h-14 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-slate-200 rounded flex items-center justify-center">
                          <span className="text-xs text-slate-400">No Img</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-800">
                          {movie.title || movie.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {movie.media_type === 'movie' ? '영화' : 'TV'} ·{' '}
                          {movie.release_date || movie.first_air_date || '연도 미상'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === YOUTUBE MODE === */}
        {formData.mode === GenerationMode.YOUTUBE && (
          <YouTubeMode
            onConfirm={(c) => onSubmitVideo?.(c)}
            isParentLoading={isLoading}
          />
        )}

        {/* === RECOMMENDATION MODE === */}
        {formData.mode === GenerationMode.RECOMMENDATION && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <Sparkles className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                <div className="text-sm text-blue-800">
                  <p className="font-bold mb-1">AI 영화 추천 (3편 + 줄거리)</p>
                  <p>
                    원하는 주제·기분을 적으면 한국에서 시청 가능한 영화 3편을 줄거리·OTT 정보와 함께 추천합니다. 카드를 누르면 바로 학습지가 생성됩니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  OTT 플랫폼 (선택)
                </label>
                <input
                  type="text"
                  value={formData.ottPlatform || ''}
                  onChange={(e) => handleChange('ottPlatform', e.target.value)}
                  placeholder="예: Netflix, TVING, 쿠팡플레이"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  관심 주제/테마 *
                </label>
                <input
                  type="text"
                  value={formData.topic || ''}
                  onChange={(e) => handleChange('topic', e.target.value)}
                  placeholder="예: 우정, 환경 보호, 용기"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {recommendError && (
              <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                {recommendError}
              </p>
            )}

            {recommendations.length === 0 && (
              <button
                onClick={handleGetRecommendations}
                disabled={isRecommending || !formData.topic}
                className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                  ${
                    isRecommending || !formData.topic
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
              >
                {isRecommending ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    AI가 영화를 찾고 있습니다...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    추천 영화 3편 보기
                  </>
                )}
              </button>
            )}

            {recommendations.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  추천 영화 3편 — 카드를 누르면 즉시 학습지가 생성됩니다
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {recommendations.map((rec, idx) => (
                    <MovieRecommendCard
                      key={`${rec.title}-${idx}`}
                      rec={rec}
                      onSelect={(r) => handleSelectRecommendation(r)}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    setRecommendations([]);
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  다른 추천 받기
                </button>
              </div>
            )}
          </div>
        )}

        {/* Common Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              대상 연령 (만 나이)
            </label>
            <input
              type="number"
              min={5}
              max={19}
              value={formData.targetAge}
              onChange={(e) => handleChange('targetAge', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">입력한 나이에 맞춰 유해성을 검사합니다.</p>
          </div>

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

        <div>
          <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Palette size={16} />
            학습지 배경 색상
          </label>
          <div className="flex flex-wrap gap-2">
            {BACKGROUND_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleChange('backgroundColor', color.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                  (formData.backgroundColor || '#ffffff') === color.value
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                style={{ backgroundColor: color.value }}
              >
                {color.name}
              </button>
            ))}
          </div>
        </div>

        {/* YouTube 모드는 자체 컨펌 버튼이 있으므로 메인 submit 숨김 */}
        {formData.mode !== GenerationMode.YOUTUBE && (
          <button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              isRecommending ||
              (formData.mode === GenerationMode.SPECIFIC_MOVIE && !formData.movieTitle)
            }
            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2
              ${
                isLoading || isRecommending
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30'
              }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                AI 분석 및 생성 중...
              </>
            ) : formData.mode === GenerationMode.RECOMMENDATION && recommendations.length === 0 ? (
              <>
                <Sparkles />
                AI 추천 영화 3편 보기
              </>
            ) : (
              '학습지 만들기'
            )}
          </button>
        )}

        {!isLoading &&
          !isRecommending &&
          formData.mode === GenerationMode.SPECIFIC_MOVIE &&
          !formData.movieTitle && (
            <p className="text-center text-sm text-slate-400 mt-2">영화 제목을 입력해주세요.</p>
          )}
      </div>
    </div>
  );
};

export default MovieForm;
