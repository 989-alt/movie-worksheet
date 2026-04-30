import React from 'react';
import type { KmrbRating } from '../services/geminiService';

interface RatingBadgeProps {
  rating: KmrbRating | string | undefined;
  size?: 'sm' | 'md';
}

const RATING_STYLE: Record<KmrbRating, { bg: string; text: string; label: string }> = {
  '전체관람가': { bg: 'bg-emerald-100', text: 'text-emerald-800', label: '전체' },
  '12세이상관람가': { bg: 'bg-sky-100', text: 'text-sky-800', label: '12+' },
  '15세이상관람가': { bg: 'bg-amber-100', text: 'text-amber-800', label: '15+' },
  '청소년관람불가': { bg: 'bg-rose-100', text: 'text-rose-800', label: '19+' },
};

const RatingBadge: React.FC<RatingBadgeProps> = ({ rating, size = 'sm' }) => {
  if (!rating) return null;
  const style = RATING_STYLE[rating as KmrbRating];
  if (!style) return null;
  const cls = size === 'md' ? 'text-sm px-2.5 py-1' : 'text-xs px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center font-bold rounded-md ${cls} ${style.bg} ${style.text}`}
      title={rating}
    >
      {style.label}
    </span>
  );
};

export default RatingBadge;
