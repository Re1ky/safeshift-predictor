import React from 'react';
import { Users, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { RiskLevel } from '../types/worker';

export type FilterCategory = 'ALL' | RiskLevel;

interface SummaryCardProps {
  title: string;
  value: number;
  type: 'total' | 'normal' | 'alerta' | 'critico';
  isSelected?: boolean;
  onClick?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  type,
  isSelected,
  onClick,
}) => {
  const getCardConfig = () => {
    switch (type) {
      case 'total':
        return {
          borderColor: 'border-l-4 border-l-slate-400',
          iconBg: 'bg-slate-100 text-slate-600',
          icon: <Users className="w-5 h-5 text-slate-600" />,
          ringColor: 'ring-2 ring-slate-400',
        };
      case 'normal':
        return {
          borderColor: 'border-l-4 border-l-emerald-500',
          iconBg: 'bg-emerald-50 text-emerald-600',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
          ringColor: 'ring-2 ring-emerald-500',
        };
      case 'alerta':
        return {
          borderColor: 'border-l-4 border-l-amber-500',
          iconBg: 'bg-amber-50 text-amber-600',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          ringColor: 'ring-2 ring-amber-500',
        };
      case 'critico':
        return {
          borderColor: 'border-l-4 border-l-red-500',
          iconBg: 'bg-red-50 text-red-600',
          icon: <ShieldAlert className="w-5 h-5 text-red-600" />,
          ringColor: 'ring-2 ring-red-500',
        };
    }
  };

  const config = getCardConfig();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      className={`bg-white rounded-lg p-5 border border-slate-200/90 shadow-sm transition-all duration-150 cursor-pointer hover:shadow-md ${
        config.borderColor
      } ${isSelected ? `${config.ringColor} shadow-md` : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            {title}
          </span>
          <span className="text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums">
            {value}
          </span>
        </div>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.iconBg}`}
        >
          {config.icon}
        </div>
      </div>
    </div>
  );
};
