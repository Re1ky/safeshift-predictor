import React from 'react';
import { History, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { Worker } from '../types/worker';

export interface HistoryRecord {
  id: string;
  fecha: string;
  trabajadorOrigen: string;
  rutOrigen: string;
  trabajadorReemplazo: string;
  accion: string;
  motivo: string;
  supervisor: string;
}

interface RRHHHistoryViewProps {
  records: HistoryRecord[];
  onBackToTurnos: () => void;
}

export const RRHHHistoryView: React.FC<RRHHHistoryViewProps> = ({
  records,
  onBackToTurnos,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-slate-700" />
            <span>Historial RRHH - Registro Transaccional de Reasignaciones</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Auditoría de medidas preventivas tomadas por supervisores de acuerdo al Art. 38 del Código del Trabajo.
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

      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {records.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-sm text-slate-700">No hay reasignaciones registradas aún en esta sesión.</p>
            <p className="text-xs text-slate-400 mt-1">
              Las acciones ejecutadas en el modal &ldquo;REASIGNAR&rdquo; aparecerán aquí como registros locales simulados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Trabajador Bloqueado</th>
                  <th className="py-3 px-4">Sustituto Asignado</th>
                  <th className="py-3 px-4">Medida Preventiva</th>
                  <th className="py-3 px-4">Motivo Registrado</th>
                  <th className="py-3 px-4">Supervisor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                      {rec.fecha}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{rec.trabajadorOrigen}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{rec.rutOrigen}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{rec.trabajadorReemplazo}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {rec.accion}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={rec.motivo}>
                      {rec.motivo}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-600">
                      {rec.supervisor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
