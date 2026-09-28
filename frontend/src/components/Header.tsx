import React from 'react';
import { User, Activity, History, FileText } from 'lucide-react';

interface HeaderProps {
  currentTab: 'turnos' | 'historial' | 'reportes';
  onSelectTab: (tab: 'turnos' | 'historial' | 'reportes') => void;
  reassignmentsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  reassignmentsCount = 0,
}) => {
  return (
    <header className="bg-[#0f172a] text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-8">
          <div
            onClick={() => onSelectTab('turnos')}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/30 transition-colors">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              SafeShift Predictor
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => onSelectTab('turnos')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentTab === 'turnos'
                  ? 'bg-slate-800 text-white font-semibold shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Turnos Activos
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('historial')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
                currentTab === 'historial'
                  ? 'bg-slate-800 text-white font-semibold shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <History className="w-4 h-4 opacity-70" />
              <span>Historial RRHH</span>
              {reassignmentsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {reassignmentsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('reportes')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentTab === 'reportes'
                  ? 'bg-slate-800 text-white font-semibold shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4 opacity-70" />
              <span>Reportes</span>
            </button>
          </nav>
        </div>

        {/* Right: User Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-medium text-slate-100 leading-tight">
              UserName
            </span>
            <span className="text-[11px] text-slate-400">Supervisor de Turno</span>
          </div>

          <div
            className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow cursor-pointer ring-2 ring-emerald-400/30 hover:ring-emerald-400 transition"
            title="Usuario activo: Supervisor"
          >
            <User className="w-5 h-5 text-slate-900" />
          </div>
        </div>
      </div>
    </header>
  );
};
