import React from 'react';
import { RiskLevel } from '../types/worker';

interface RiskBadgeProps {
  nivel: RiskLevel;
  riesgo?: number;
  label?: string;
  variant?: 'table' | 'substitute';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  nivel,
  riesgo,
  label,
  variant = 'table',
}) => {
  if (variant === 'substitute') {
    if (nivel === 'NORMAL') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border border-emerald-500/40 bg-emerald-50 text-emerald-700">
          {label || 'RIESGO BAJO'}
        </span>
      );
    }
    if (nivel === 'ALERTA') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border border-slate-300 bg-slate-100 text-slate-600">
          {label || 'RIESGO MEDIO'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border border-red-500/40 bg-red-50 text-red-700">
        {label || 'RIESGO ALTO'}
      </span>
    );
  }

  // Standard table badge with percentage
  switch (nivel) {
    case 'NORMAL':
      return (
        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f7ef] text-[#168a53] border border-[#b2e7cd] tracking-wide whitespace-nowrap">
          {label || `NORMAL ${riesgo !== undefined ? `${riesgo}%` : ''}`}
        </span>
      );
    case 'ALERTA':
      return (
        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-[#fef7e6] text-[#b45309] border border-[#fde68a] tracking-wide whitespace-nowrap">
          {label || `ALERTA ${riesgo !== undefined ? `${riesgo}%` : ''}`}
        </span>
      );
    case 'CRITICO':
    case 'CRÍTICO':
      return (
        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5] tracking-wide whitespace-nowrap">
          {label || `CRÍTICO ${riesgo !== undefined ? `${riesgo}%` : ''}`}
        </span>
      );
    default:
      return null;
  }
};
