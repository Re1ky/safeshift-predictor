import React from 'react';
import { User, Activity, History, FileText, Upload, Shield, Cpu, LogOut } from 'lucide-react';

export interface ActiveUser {
  id?: number;
  rut?: string;
  nombre: string;
  rol: string;
  correo: string;
}

export type AppTab = 'turnos' | 'ml' | 'historial' | 'reportes';

interface HeaderProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  reassignmentsCount?: number;
  currentUser: ActiveUser;
  onLogout: () => void;
  onOpenIngestModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  reassignmentsCount = 0,
  currentUser,
  onLogout,
  onOpenIngestModal,
}) => {
  return (
    <header className="bg-[#0f172a] text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-6 lg:gap-8">
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

          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => onSelectTab('turnos')}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                currentTab === 'turnos'
                  ? 'bg-slate-800 text-white font-semibold shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Turnos Activos
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('ml')}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'ml'
                  ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Motor ML (.pkl)</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('historial')}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors relative flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
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

        {/* Right: Actions & Authenticated Session */}
        <div className="flex items-center gap-3">
          {onOpenIngestModal && (
            <button
              type="button"
              onClick={onOpenIngestModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Ingresar Turnos (CSV / ML)</span>
            </button>
          )}

          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-700">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs sm:text-sm font-semibold text-slate-100 leading-tight">
                {currentUser.nombre}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">
                {currentUser.rol}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow">
              {currentUser.rol.includes('RRHH') ? (
                <Shield className="w-4 h-4 text-slate-900" />
              ) : (
                <User className="w-4 h-4 text-slate-900" />
              )}
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="ml-1 p-2 rounded-lg bg-slate-800 hover:bg-red-600/90 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Cerrar sesión activa"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xl:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};