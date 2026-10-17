import React from 'react';
import { X, User, Clock, Moon, ShieldCheck, AlertCircle, Calendar } from 'lucide-react';
import { Worker } from '../types/worker';
import { RiskBadge } from './RiskBadge';

interface WorkerDetailModalProps {
  isOpen: boolean;
  worker: Worker | null;
  onClose: () => void;
  onOpenReassign?: (worker: Worker) => void;
}

export const WorkerDetailModal: React.FC<WorkerDetailModalProps> = ({
  isOpen,
  worker,
  onClose,
  onOpenReassign,
}) => {
  if (!isOpen || !worker) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0f172a] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold tracking-wide uppercase">
              Ficha del Trabajador
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Identity Info */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                {worker.nombre}
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                {worker.cargo} · RUT: {worker.rut}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Turno: {worker.turno}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Estado: {worker.estadoDisponibilidad}
                </span>
              </div>
            </div>
            <RiskBadge nivel={worker.nivel} riesgo={worker.riesgo} />
          </div>

          {/* Operational Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                <span className="font-semibold">Horas Semanales</span>
              </div>
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {worker.horasSemanales} hrs
              </p>
              <span className="text-[11px] text-slate-500">
                {worker.horasSemanales > 45 ? '⚠️ Excede límite ordinario' : '✓ Dentro de límite ordinario'}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="font-semibold">Noches Seguidas</span>
              </div>
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {worker.nochesConsecutivas} noches
              </p>
              <span className="text-[11px] text-slate-500">
                {worker.nochesConsecutivas >= 3 ? '⚠️ Alto desgaste circadiano' : '✓ Normal'}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                <span className="font-semibold">Último Descanso</span>
              </div>
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {worker.ultimoDescansoHoras || 12} hrs
              </p>
              <span className="text-[11px] text-slate-500">Ventana de reposo</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                <span className="font-semibold">Cumplimiento Legal</span>
              </div>
              <p className="text-sm font-bold text-slate-900">
                {worker.nivel === 'CRÍTICO' || worker.nivel === 'CRITICO'
                  ? 'Art. 38 En Infracción'
                  : 'Conforme Art. 38'}
              </p>
              <span className="text-[11px] text-slate-500">Código del Trabajo</span>
            </div>
          </div>

          {/* Reassignment info if applied */}
          {worker.accionPreventiva && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              <div className="flex items-center gap-1 font-bold text-amber-800 mb-1">
                <AlertCircle className="w-4 h-4" />
                <span>Medida Preventiva Aplicada</span>
              </div>
              <p><strong>Acción:</strong> {worker.accionPreventiva}</p>
              {worker.sustitutoAsignado && (
                <p><strong>Sustituto:</strong> {worker.sustitutoAsignado}</p>
              )}
              {worker.motivoReasignacion && (
                <p><strong>Motivo:</strong> {worker.motivoReasignacion}</p>
              )}
            </div>
          )}

          {/* Action button if critical */}
          {(worker.nivel === 'CRÍTICO' || worker.nivel === 'CRITICO') && onOpenReassign && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReassign(worker);
                }}
                className="w-full bg-[#dc2626] hover:bg-red-700 text-white font-semibold text-xs py-2.5 rounded-lg shadow transition-colors flex items-center justify-center gap-2"
              >
                Reasignar Trabajador Inmediatamente
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
