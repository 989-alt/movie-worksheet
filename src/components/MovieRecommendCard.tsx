import React, { useEffect, useState } from 'react';
import { CheckCircle, Tv, Link as LinkIcon } from 'lucide-react';
import { resolveOttForTitle, MovieOttInfo } from '../services/ottService';
import type { MovieRecommendation } from '../services/geminiService';
import RatingBadge from './RatingBadge';

interface MovieRecommendCardProps {
  rec: MovieRecommendation;
  onSelect: (rec: MovieRecommendation, ott: MovieOttInfo | null) => void;
}

const MovieRecommendCard: React.FC<MovieRecommendCardProps> = ({ rec, onSelect }) => {
  const [ott, setOtt] = useState<MovieOttInfo | null>(null);
  const [ottLoading, setOttLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    setOttLoading(true);
    resolveOttForTitle(rec.title)
      .then((info) => {
        if (alive) setOtt(info);
      })
      .catch(() => {
        if (alive) setOtt(null);
      })
      .finally(() => {
        if (alive) setOttLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [rec.title]);

  const flatrate = ott?.providers.flatrate ?? [];
  const ottNames = flatrate.map((p) => p.provider_name).slice(0, 4);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(rec, ott)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(rec, ott);
        }
      }}
      className="text-left p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-slate-800 group-hover:text-blue-700 leading-snug">
              {rec.title}
            </h4>
            <RatingBadge rating={rec.koreanRating} />
          </div>
          {(rec.year || rec.genre) && (
            <p className="text-xs text-slate-500 mt-0.5">
              {[rec.year, rec.genre].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <CheckCircle
          size={20}
          className="text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0"
        />
      </div>

      <p className="text-sm text-slate-700 mt-2 font-medium">{rec.reason}</p>

      {rec.topicConnection && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 px-2 py-1.5 rounded-md">
          <LinkIcon size={12} className="mt-0.5 flex-shrink-0" />
          <span>{rec.topicConnection}</span>
        </div>
      )}

      {rec.plotSummary && (
        <div className="mt-3 text-xs text-slate-600">
          <p
            className={
              expanded
                ? 'whitespace-pre-line leading-relaxed'
                : 'line-clamp-3 leading-relaxed'
            }
          >
            {rec.plotSummary}
          </p>
          {rec.plotSummary.length > 120 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="text-blue-600 hover:underline mt-1"
            >
              {expanded ? '줄거리 접기' : '줄거리 더보기'}
            </button>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs">
        <Tv size={14} className="text-slate-400 flex-shrink-0" />
        {ottLoading ? (
          <span className="text-slate-400">OTT 확인 중…</span>
        ) : ottNames.length > 0 ? (
          <span className="text-emerald-700 font-medium">{ottNames.join(' · ')}</span>
        ) : (
          <span className="text-slate-400">한국 OTT 정보 없음</span>
        )}
      </div>
    </div>
  );
};

export default MovieRecommendCard;
