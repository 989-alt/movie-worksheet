import React, { useMemo, useState } from 'react';
import { BookOpen, Loader2, CheckCircle, ChevronRight, Sparkles, Tv, Link as LinkIcon } from 'lucide-react';
import { ALL_UNITS, UnitMeta, listGrades, listSubjects, listUnitsBy } from '../data/curriculumIndex';
import RatingBadge from './RatingBadge';
import type { UnitMovieRecommendation } from '../services/curriculumService';

export type { UnitMovieRecommendation };

interface UnitPickerProps {
  isLoading: boolean;
  targetAge: number;
  onSelectUnit?: (unit: UnitMeta) => void;
  onRecommend: (unit: UnitMeta) => Promise<UnitMovieRecommendation[]>;
  onSelectMovie: (unit: UnitMeta, rec: UnitMovieRecommendation) => void;
}

const SUBJECT_LABEL_FALLBACK: Record<string, string> = {
  social: '사회',
  'korean-a': '국어 (가)',
  'korean-b': '국어 (나)',
  korean: '국어',
};

const UnitPicker: React.FC<UnitPickerProps> = ({
  isLoading,
  targetAge,
  onSelectUnit,
  onRecommend,
  onSelectMovie,
}) => {
  const [grade, setGrade] = useState<number | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [selectedUnitKey, setSelectedUnitKey] = useState<string | null>(null);

  const [recs, setRecs] = useState<UnitMovieRecommendation[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  const grades = useMemo(() => listGrades(), []);
  const semesters = useMemo(() => {
    if (grade == null) return [];
    return Array.from(
      new Set(ALL_UNITS.filter((u) => u.grade === grade).map((u) => u.semester))
    ).sort((a, b) => a - b);
  }, [grade]);
  const subjects = useMemo(() => {
    if (grade == null || semester == null) return [];
    return listSubjects(grade, semester);
  }, [grade, semester]);
  const units = useMemo(() => {
    if (grade == null || semester == null || !subject) return [];
    return listUnitsBy({ grade, semester, subject }).sort((a, b) => a.unitNumber - b.unitNumber);
  }, [grade, semester, subject]);

  const selectedUnit = useMemo(
    () => units.find((u) => u.unitKey === selectedUnitKey) || null,
    [units, selectedUnitKey]
  );

  const subjectDisplay = (s: string, label?: string) => label || SUBJECT_LABEL_FALLBACK[s] || s;

  // 단원 선택 시 부모에 알림 + 자동 추천 호출
  const handlePickUnit = async (u: UnitMeta) => {
    setSelectedUnitKey(u.unitKey);
    setRecs([]);
    setRecError(null);
    onSelectUnit?.(u);

    setRecLoading(true);
    try {
      const rs = await onRecommend(u);
      setRecs(rs);
    } catch (e: any) {
      setRecError(e?.message || '추천 영화를 가져오지 못했습니다.');
    } finally {
      setRecLoading(false);
    }
  };

  if (ALL_UNITS.length === 0) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
        <p className="font-bold mb-1">📚 단원 데이터 준비 중</p>
        <p>
          개발자가 <code className="bg-white px-1 rounded">scripts/parse-textbook.ts</code>를 실행하면 이 화면에서 학년·교과·단원을 선택할 수 있게 됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100">
        <div className="flex items-start gap-3">
          <BookOpen className="text-emerald-600 mt-0.5 flex-shrink-0" size={20} />
          <div className="text-sm text-emerald-800">
            <p className="font-bold mb-1">교과서 단원으로 시작</p>
            <p>학년·학기·교과·단원을 차례로 고르면 단원 성취기준에 맞는 영화 후보를 자동 추천합니다.</p>
          </div>
        </div>
      </div>

      {/* Grade */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">학년</label>
        <div className="flex flex-wrap gap-2">
          {grades.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGrade(g);
                setSemester(null);
                setSubject(null);
                setSelectedUnitKey(null);
                setRecs([]);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                grade === g
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              {g}학년
            </button>
          ))}
        </div>
      </div>

      {/* Semester */}
      {grade != null && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">학기</label>
          <div className="flex flex-wrap gap-2">
            {semesters.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSemester(s);
                  setSubject(null);
                  setSelectedUnitKey(null);
                  setRecs([]);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                  semester === s
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                {s}학기
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subject */}
      {grade != null && semester != null && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">교과</label>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => {
              const sample = listUnitsBy({ grade, semester, subject: s })[0];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSubject(s);
                    setSelectedUnitKey(null);
                    setRecs([]);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                    subject === s
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  {subjectDisplay(s, sample?.subjectLabel)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Unit list */}
      {subject && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">단원</label>
          <div className="grid grid-cols-1 gap-2">
            {units.map((u) => (
              <button
                key={u.unitKey}
                type="button"
                onClick={() => handlePickUnit(u)}
                disabled={isLoading || recLoading}
                className={`text-left p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                  selectedUnitKey === u.unitKey
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-emerald-300'
                } ${isLoading || recLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    selectedUnitKey === u.unitKey
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {u.unitNumber}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800">{u.unitTitle}</div>
                  {u.keyTopics.length > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {u.keyTopics.slice(0, 4).join(' · ')}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected unit detail + recommendations */}
      {selectedUnit && (
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h4 className="font-bold text-slate-800">{selectedUnit.unitTitle}</h4>
            <p className="text-xs text-slate-500 mt-1">
              만 {targetAge}세 기준 — 시청 등급 자동 필터링됨
            </p>
            {selectedUnit.achievements.length > 0 && (
              <div className="mt-2 text-sm">
                <p className="font-semibold text-slate-600 mb-1">성취기준</p>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  {selectedUnit.achievements.slice(0, 3).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {recLoading && (
            <div className="text-center py-4 text-slate-500">
              <Loader2 className="animate-spin inline mr-2" size={16} />
              단원에 어울리는 영화를 찾는 중...
            </div>
          )}

          {recError && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
              {recError}
            </p>
          )}

          {recs.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                이 단원에 어울리는 영화 — 카드를 누르면 학습지 자동 생성
              </p>
              <div className="grid grid-cols-1 gap-3">
                {recs.map((r, idx) => (
                  <button
                    key={`${r.title}-${idx}`}
                    type="button"
                    onClick={() => onSelectMovie(selectedUnit, r)}
                    disabled={isLoading}
                    className="text-left p-4 border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group disabled:opacity-50"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-slate-800 group-hover:text-emerald-700">
                            {r.title}
                          </h5>
                          <RatingBadge rating={r.koreanRating} />
                        </div>
                        {(r.year || r.genre) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[r.year, r.genre].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <Sparkles
                        size={18}
                        className="text-slate-300 group-hover:text-emerald-500 flex-shrink-0"
                      />
                    </div>
                    <p className="text-sm text-slate-700 mt-2 font-medium">{r.reason}</p>
                    {r.unitConnection && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded-md">
                        <LinkIcon size={12} className="mt-0.5 flex-shrink-0" />
                        <span>{r.unitConnection}</span>
                      </div>
                    )}
                    {r.plotSummary && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                        {r.plotSummary}
                      </p>
                    )}
                    {r.ottProviders && r.ottProviders.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <Tv size={14} className="text-slate-400" />
                        <span className="text-emerald-700 font-medium">
                          {r.ottProviders
                            .slice(0, 4)
                            .map((p) => p.provider_name)
                            .join(' · ')}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UnitPicker;
