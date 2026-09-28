import React from 'react';
import { FileText, TrendingDown, ShieldCheck, AlertTriangle } from 'lucide-react';

interface ReportsViewProps {
  onBackToTurnos: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onBackToTurnos }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-700" />
            <span>Módulo de Reportes &amp; Métricas Preventivas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Análisis de distribución de fatiga, índices de siniestralidad proyectada y cumplimiento del Código del Trabajo.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToTurnos}
          className="text-xs font-semibold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors self-start sm:self-auto cursor-pointer"
        >
          ← Volver a Turnos Activos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tasa de Incidentes Estimada</span>
            <TrendingDown className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">-72%</div>
          <p className="text-xs text-slate-500 mt-1">
            Reducción proyectada al bloquear operarios con &gt;80% fatiga.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cumplimiento Art. 38</span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">97.8%</div>
          <p className="text-xs text-slate-500 mt-1">
            Descansos compensatorios auditables ante la Dirección del Trabajo.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Horas Críticas Promedio</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">51.3 hrs</div>
          <p className="text-xs text-slate-500 mt-1">
            Promedio semanal de trabajadores en nivel crítico previo a reasignar.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800">
          Distribución de Carga por Turno
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Turno Noche (22:00 - 06:00)</span>
              <span>18 operarios (2 en riesgo crítico)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '42%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Turno Día (07:00 - 15:30)</span>
              <span>22 operarios (1 en riesgo alerta)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '78%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Turno Mixto / Rotativo</span>
              <span>8 operarios (1 en riesgo crítico)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '35%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
