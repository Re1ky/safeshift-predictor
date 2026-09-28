import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { SummaryCard, FilterCategory } from './components/SummaryCard';
import { WorkerTable } from './components/WorkerTable';
import { ReassignmentModal } from './components/ReassignmentModal';
import { WorkerDetailModal } from './components/WorkerDetailModal';
import { RRHHHistoryView, HistoryRecord } from './components/RRHHHistoryView';
import { ReportsView } from './components/ReportsView';
import { INITIAL_WORKERS, SUBSTITUTE_CANDIDATES } from './data/mockWorkers';
import { Worker, RiskLevel, ReassignmentPayload } from './types/worker';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  // Navigation tab state
  const [currentTab, setCurrentTab] = useState<'turnos' | 'historial' | 'reportes'>('turnos');

  // Workers state (purely local state as requested)
  const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | RiskLevel>('ALL');

  // Modals state
  const [reassignWorker, setReassignWorker] = useState<Worker | null>(null);
  const [detailWorker, setDetailWorker] = useState<Worker | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // History records state (starts with an audit entry or empty, gets populated upon reassignments)
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([
    {
      id: 'hist-0',
      fecha: '2026-09-27 14:30',
      trabajadorOrigen: 'Héctor Tapia S.',
      rutOrigen: '15.902.431-7',
      trabajadorReemplazo: 'Juana Pérez G.',
      accion: 'Bloqueado Preventivo (Descanso 24h)',
      motivo: 'Exceso de 48h acumuladas en turno rotativo. Descanso obligatorio.',
      supervisor: 'Supervisor de Turno',
    },
  ]);

  // Summary counts matching specification:
  // TOTAL OPERARIOS: 48, ESTADO NORMAL: 39, ALERTA PREVENTIVA: 6, RIESGO CRÍTICO: 3
  const [counts, setCounts] = useState({
    total: 48,
    normal: 39,
    alerta: 6,
    critico: 3,
  });

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      // Risk filter
      if (selectedRiskFilter !== 'ALL' && worker.nivel !== selectedRiskFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = worker.nombre.toLowerCase().includes(q);
        const matchesRut = worker.rut.toLowerCase().includes(q);
        const matchesShift = worker.turno.toLowerCase().includes(q);
        const matchesCargo = worker.cargo.toLowerCase().includes(q);
        return matchesName || matchesRut || matchesShift || matchesCargo;
      }
      return true;
    });
  }, [workers, selectedRiskFilter, searchQuery]);

  // Handle opening reassignment modal
  const handleOpenReassign = (worker: Worker) => {
    setReassignWorker(worker);
  };

  // Handle confirmation of reassignment
  const handleConfirmReassignment = (payload: ReassignmentPayload) => {
    const targetWorker = workers.find((w) => w.id === payload.workerId);
    const substituteCand = SUBSTITUTE_CANDIDATES.find(
      (c) => c.id === payload.substituteId,
    );

    const substituteName = substituteCand ? substituteCand.nombre : 'Juana Pérez G.';

    // Update workers locally
    setWorkers((prev) =>
      prev.map((w) => {
        if (w.id === payload.workerId) {
          return {
            ...w,
            estadoDisponibilidad: 'BLOQUEADO_PREVENTIVO',
            accionPreventiva: payload.accionPreventiva,
            sustitutoAsignado: substituteName,
            motivoReasignacion: payload.motivo,
            fechaReasignacion: new Date().toLocaleTimeString('es-CL', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
        }
        return w;
      }),
    );

    // Add to transactional audit history
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRecord: HistoryRecord = {
      id: `hist-${Date.now()}`,
      fecha: formattedDate,
      trabajadorOrigen: targetWorker ? targetWorker.nombre : 'Rodrigo Vega M.',
      rutOrigen: targetWorker ? targetWorker.rut : '16.782.901-3',
      trabajadorReemplazo: substituteName,
      accion: payload.accionPreventiva,
      motivo: payload.motivo,
      supervisor: 'Supervisor de Turno',
    };

    setHistoryRecords((prev) => [newRecord, ...prev]);

    // Show simulated confirmation toast
    setToastMessage(
      `Reasignación confirmada con éxito: ${targetWorker?.nombre || 'Trabajador'} queda en "${payload.accionPreventiva}" y sustituido por ${substituteName}.`,
    );

    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans antialiased">
      {/* Dark Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        reassignmentsCount={historyRecords.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="mb-6 bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-lg shadow-sm flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-xs text-emerald-700 hover:text-emerald-950 font-bold ml-4"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Tab 1: Turnos Activos (Default main dashboard) */}
        {currentTab === 'turnos' && (
          <div className="space-y-6">
            {/* Section Title */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Resumen del turno actual
              </h1>
            </div>

            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                title="TOTAL OPERARIOS"
                value={counts.total}
                type="total"
                isSelected={selectedRiskFilter === 'ALL'}
                onClick={() => setSelectedRiskFilter('ALL')}
              />
              <SummaryCard
                title="ESTADO NORMAL"
                value={counts.normal}
                type="normal"
                isSelected={selectedRiskFilter === 'NORMAL'}
                onClick={() =>
                  setSelectedRiskFilter(
                    selectedRiskFilter === 'NORMAL' ? 'ALL' : 'NORMAL',
                  )
                }
              />
              <SummaryCard
                title="ALERTA PREVENTIVA"
                value={counts.alerta}
                type="alerta"
                isSelected={selectedRiskFilter === 'ALERTA'}
                onClick={() =>
                  setSelectedRiskFilter(
                    selectedRiskFilter === 'ALERTA' ? 'ALL' : 'ALERTA',
                  )
                }
              />
              <SummaryCard
                title="RIESGO CRÍTICO"
                value={counts.critico}
                type="critico"
                isSelected={selectedRiskFilter === 'CRITICO'}
                onClick={() =>
                  setSelectedRiskFilter(
                    selectedRiskFilter === 'CRITICO' ? 'ALL' : 'CRITICO',
                  )
                }
              />
            </div>

            {/* Monitoring Table Section */}
            <WorkerTable
              workers={filteredWorkers}
              onOpenReassign={handleOpenReassign}
              onOpenDetail={(w) => setDetailWorker(w)}
              selectedRiskFilter={selectedRiskFilter}
              onSelectRiskFilter={setSelectedRiskFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalPoolCount={counts.total}
            />
          </div>
        )}

        {/* Tab 2: Historial RRHH */}
        {currentTab === 'historial' && (
          <RRHHHistoryView
            records={historyRecords}
            onBackToTurnos={() => setCurrentTab('turnos')}
          />
        )}

        {/* Tab 3: Reportes */}
        {currentTab === 'reportes' && (
          <ReportsView onBackToTurnos={() => setCurrentTab('turnos')} />
        )}
      </main>

      {/* Reassignment Modal */}
      <ReassignmentModal
        isOpen={Boolean(reassignWorker)}
        worker={reassignWorker}
        onClose={() => setReassignWorker(null)}
        onConfirm={handleConfirmReassignment}
      />

      {/* Worker Detail Modal */}
      <WorkerDetailModal
        isOpen={Boolean(detailWorker)}
        worker={detailWorker}
        onClose={() => setDetailWorker(null)}
        onOpenReassign={(w) => {
          setDetailWorker(null);
          setReassignWorker(w);
        }}
      />
    </div>
  );
}
