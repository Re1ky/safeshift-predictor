import React, { useState } from 'react';
import { Search, Filter, ChevronDown, Check } from 'lucide-react';
import { Worker, RiskLevel } from '../types/worker';
import { RiskBadge } from './RiskBadge';

interface WorkerTableProps {
  workers: Worker[];
  onOpenReassign: (worker: Worker) => void;
  onOpenDetail: (worker: Worker) => void;
  selectedRiskFilter: 'ALL' | RiskLevel;
  onSelectRiskFilter: (filter: 'ALL' | RiskLevel) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalPoolCount?: number;
}

export const WorkerTable: React.FC<WorkerTableProps> = ({
  workers,
  onOpenReassign,
  onOpenDetail,
  selectedRiskFilter,
  onSelectRiskFilter,
  searchQuery,
  onSearchChange,
  totalPoolCount = 48,
}) => {
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const filterOptions: { label: string; value: 'ALL' | RiskLevel }[] = [
    { label: 'Todos los riesgos', value: 'ALL' },
    { label: 'Normal (<50%)', value: 'NORMAL' },
    { label: 'Alerta (50% - 80%)', value: 'ALERTA' },
    { label: 'Crítico (>80%)', value: 'CRITICO' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 overflow-hidden">
      {/* Table Section Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80">
        <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight mb-4">
          Monitoreo de Cuadrillas - Predicción del Próximo Turno
        </h2>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar trabajador..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-2xs transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {selectedRiskFilter === 'ALL'
                    ? 'Filtrar por Riesgo'
                    : `Filtro: ${selectedRiskFilter}`}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {filterDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setFilterDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-xs">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onSelectRiskFilter(opt.value);
                        setFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 flex items-center justify-between font-medium text-slate-700"
                    >
                      <span>{opt.label}</span>
                      {selectedRiskFilter === opt.value && (
                        <Check className="w-3.5 h-3.5 text-slate-900" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th scope="col" className="py-3 px-4">
                Rut
              </th>
              <th scope="col" className="py-3 px-4">
                Trabajador
              </th>
              <th scope="col" className="py-3 px-4">
                Turno
              </th>
              <th scope="col" className="py-3 px-4 text-center">
                Horas Semanales
              </th>
              <th scope="col" className="py-3 px-4 text-center">
                Noches Consecutivas
              </th>
              <th scope="col" className="py-3 px-4 text-center">
                Nivel Riesgo
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Acción
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {workers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No se encontraron trabajadores que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              workers.map((w) => {
                const isCritical = w.nivel === 'CRÍTICO' || w.nivel === 'CRITICO';
                return (
                  <tr
                    key={w.id}
                    className={`transition-colors ${
                      isCritical
                        ? 'bg-[#fff5f5] hover:bg-[#ffebeb]'
                        : 'bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    {/* RUT */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">
                      {w.rut}
                    </td>

                    {/* Trabajador */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {w.nombre}
                        </span>
                        {w.cargo && (
                          <span className="text-[11px] text-slate-400">
                            {w.cargo}
                          </span>
                        )}
                        {w.estadoDisponibilidad === 'BLOQUEADO_PREVENTIVO' && (
                          <span className="text-[10px] text-red-600 font-semibold mt-0.5">
                            🔒 Bloqueado Preventivo (Descanso 24h)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Turno */}
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {w.turno}
                    </td>

                    {/* Horas Semanales */}
                    <td
                      className={`py-3 px-4 text-center tabular-nums font-semibold ${
                        isCritical ? 'text-red-700' : 'text-slate-700'
                      }`}
                    >
                      {w.horasSemanales}
                    </td>

                    {/* Noches Consecutivas */}
                    <td
                      className={`py-3 px-4 text-center tabular-nums font-semibold ${
                        isCritical ? 'text-red-700' : 'text-slate-700'
                      }`}
                    >
                      {w.nochesConsecutivas}
                    </td>

                    {/* Nivel Riesgo */}
                    <td className="py-3 px-4 text-center">
                      <RiskBadge nivel={w.nivel} riesgo={w.riesgo} />
                    </td>

                    {/* Acción */}
                    <td className="py-3 px-4 text-right">
                      {isCritical ? (
                        <button
                          type="button"
                          onClick={() => onOpenReassign(w)}
                          className="bg-[#dc2626] hover:bg-red-700 active:bg-red-800 text-white font-bold text-[11px] px-3.5 py-1.5 rounded uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
                        >
                          REASIGNAR
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenDetail(w)}
                          className="border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-bold text-[11px] px-3.5 py-1.5 rounded uppercase tracking-wider transition-colors cursor-pointer bg-white"
                        >
                          DETALLE
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Mostrando{' '}
          <span className="font-semibold text-slate-700">
            {workers.length}
          </span>{' '}
          de{' '}
          <span className="font-semibold text-slate-700">{totalPoolCount}</span>{' '}
          trabajadores monitoreados
        </div>

        {/* Semaphoric Legend */}
        <div className="flex items-center gap-4 text-[11px] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Normal (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>Alerta (50% - 80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
            <span>Crítico (&gt;80%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
