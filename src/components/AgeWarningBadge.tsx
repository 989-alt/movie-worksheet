import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AgeWarningBadgeProps {
  visible: boolean;
}

/**
 * 카드 우측 상단에 절대위치로 띄우는 빨간 경고 배지.
 * 부모 컨테이너는 `relative` 가지고 있어야 함.
 */
const AgeWarningBadge: React.FC<AgeWarningBadgeProps> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div
      role="img"
      aria-label="시청 연령 주의"
      title="시청 연령 주의 — 학생 연령보다 등급이 높을 수 있습니다. 시청 전 교사 사전 검토 필수."
      className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-red-600 text-white text-xs font-bold shadow-md"
    >
      <AlertTriangle size={12} strokeWidth={2.5} />
      <span>시청연령 주의</span>
    </div>
  );
};

export default AgeWarningBadge;
