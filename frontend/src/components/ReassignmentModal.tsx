import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  X,
  ChevronDown,
  Database,
  Check,
} from 'lucide-react';
import { Worker, ReassignmentPayload } from '../types/worker';
import { SUBSTITUTE_CANDIDATES } from '../data/mockWorkers';
import { RiskBadge } from './RiskBadge';

interface ReassignmentModalProps {
  isOpen: boolean;
  worker: Worker | null;
  onClose: () => void;
  onConfirm: (payload: ReassignmentPayload) => void;
}

export const ReassignmentModal: React.FC<ReassignmentModalProps> = ({
  isOpen,
  worker,
  onClose,
  onConfirm,
}) => {
  const [actionPreventiva, setActionPreventiva] = useState(
    'Bloqueado Preventivo (Descanso 24h)',
  );
  const [selectedSubstituteId, setSelectedSubstituteId] = useState(
    SUBSTITUTE_CANDIDATES[0]?.id || 'w-1',
  );
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !worker) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate local state commit
    setTimeout(() => {
      onConfirm({
        workerId: worker.id,
        accionPreventiva: actionPreventiva,
        substituteId: selectedSubstituteId,
        motivo: motivo.trim() || 'Protocolo de prevención de fatiga extrema aplicado.',
      });
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 transition-all flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#dc2626] text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-white/90" />
            <h2
              id="modal-title"
              className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white"
            >
              GESTIÓN PREVENTIVA: REASIGNACIÓN DE TURNO
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Summary Alert Box */}
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3.5 sm:p-4 text-xs">
            <div className="flex items-center gap-1.5 text-red-800 font-bold mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Resumen del Trabajador a Reasignar</span>
            </div>
            <ul className="space-y-1.5 text-slate-800 font-medium pl-1 text-[12px] sm:text-[13px]">
              <li className="flex items-start gap-1.5">
                <span className="text-red-500 font-bold">•</span>
                <span>
                  <strong>Trabajador en Riesgo :</strong> {worker.nombre} (
                  {worker.cargo}) - RUT: {worker.rut}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-red-500 font-bold">•</span>
                <span>
                  <strong>Diagnóstico ML:</strong> Nivel de Fatiga CRÍTICO (
                  {worker.riesgo}%)
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-red-500 font-bold">•</span>
                <span>
                  <strong>Factores:</strong> {worker.nochesConsecutivas > 0 ? `${worker.nochesConsecutivas} Turnos nocturnos seguidos` : 'Sobrecarga de turno'} + {worker.horasSemanales} Horas semanales acumuladas
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-red-500 font-bold">•</span>
                <span>
                  <strong>Protocolo RRHH:</strong> Descanso compensatorio
                  obligatorio (Art. 38 Código del Trabajo)
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-1">
            <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase block mb-3">
              ACCIÓN DISCIPLINARIA DEL SUPERVISOR:
            </span>

            {/* Step 1: Action Selector */}
            <div className="mb-4">
              <label
                htmlFor="action-preventiva"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Paso 1: Nuevo Estado del Trabajador
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-red-600 inline-block mr-2" />
                </div>
                <select
                  id="action-preventiva"
                  value={actionPreventiva}
                  onChange={(e) => setActionPreventiva(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-9 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 appearance-none shadow-xs cursor-pointer"
                >
                  <option value="Bloqueado Preventivo (Descanso 24h)">
                    Bloqueado Preventivo (Descanso 24h)
                  </option>
                  <option value="Permiso Compensatorio (Descanso 48h)">
                    Permiso Compensatorio (Descanso 48h)
                  </option>
                  <option value="Cambio a Turno Diurno Liviano">
                    Cambio a Turno Diurno Liviano
                  </option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Step 2: Select Substitute */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Paso 2: Seleccionar Trabajador Sustituto
              </label>
              <div className="space-y-2">
                {SUBSTITUTE_CANDIDATES.map((cand) => {
                  const isChecked = selectedSubstituteId === cand.id;
                  return (
                    <label
                      key={cand.id}
                      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="substitute"
                          value={cand.id}
                          checked={isChecked}
                          onChange={() => setSelectedSubstituteId(cand.id)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 accent-emerald-600 cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm font-semibold text-slate-800">
                          {cand.nombre}
                        </span>
                        <span className="text-[11px] text-slate-500 hidden sm:inline">
                          ({cand.rut})
                        </span>
                      </div>

                      <RiskBadge
                        nivel={cand.nivel}
                        label={cand.riskLabel}
                        variant="substitute"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Movement Reason */}
            <div className="mb-2">
              <label
                htmlFor="motivo-movimiento"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Paso 3: Motivo del Movimiento
              </label>
              <textarea
                id="motivo-movimiento"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Describa brevemente la justificación médica o de seguridad para esta reasignación obligatoria..."
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none shadow-xs"
              />
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="border-t border-slate-200 pt-4 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium text-xs rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#dc2626] hover:bg-red-700 active:bg-red-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Confirmar Reasignación y Actualizar BD</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
