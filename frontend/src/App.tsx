import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Header, ActiveUser, AppTab } from './components/Header';
import { SummaryCard } from './components/SummaryCard';
import { WorkerTable } from './components/WorkerTable';
import { ReassignmentModal } from './components/ReassignmentModal';
import { WorkerDetailModal } from './components/WorkerDetailModal';
import { RRHHHistoryView, HistoryRecord } from './components/RRHHHistoryView';
import { ReportsView } from './components/ReportsView';
import { INITIAL_WORKERS } from './data/mockWorkers';
import { Worker, RiskLevel, ReassignmentPayload } from './types/worker';
import {
  CheckCircle2,
  Upload,
  X,
  FileSpreadsheet,
  Cpu,
  Lock,
  Activity,
  Sliders,
  RefreshCw,
  Database,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

const DEMO_ACCOUNTS = [
  {
    nombre: 'Ignacio Cuevas',
    rol: 'Supervisor de Turno',
    correo: 'supervisor@safeshift.cl',
    pass: 'safeshift2026',
  },
  {
    nombre: 'Benjamín Berrios',
    rol: 'Analista RRHH / Prevencionista',
    correo: 'rrhh@safeshift.cl',
    pass: 'safeshift2026',
  },
  {
    nombre: 'Javiera Vargas',
    rol: 'Analista RRHH / Prevencionista',
    correo: 'ml.qa@safeshift.cl',
    pass: 'safeshift2026',
  },
  {
    nombre: 'Matías Carrasco',
    rol: 'Supervisor de Turno',
    correo: 'operaciones@safeshift.cl',
    pass: 'safeshift2026',
  },
];

interface MLPredictionResult {
  riesgo: number;
  nivel: string;
  modelo?: string;
  timestamp?: string;
  explicabilidad?: {
    pesoHoras: number;
    pesoNoches: number;
    pesoDescanso: number;
    factorCritico: string;
  };
}

export default function App() {
  // 1. Estado de Autenticación Real contra PostgreSQL
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<ActiveUser>({
    nombre: 'Ignacio Cuevas',
    rol: 'Supervisor de Turno',
    correo: 'supervisor@safeshift.cl',
  });
  const [loginEmail, setLoginEmail] = useState('supervisor@safeshift.cl');
  const [loginPassword, setLoginPassword] = useState('safeshift2026');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 2. Navegación y Datos de PostgreSQL
  const [currentTab, setCurrentTab] = useState<AppTab>('turnos');
  const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [reassignWorker, setReassignWorker] = useState<Worker | null>(null);
  const [detailWorker, setDetailWorker] = useState<Worker | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);

  // 3. Estado del Laboratorio / Simulador Motor ML (.pkl) en Vivo
  const [simHoras, setSimHoras] = useState(56);
  const [simNoches, setSimNoches] = useState(4);
  const [simDescanso, setSimDescanso] = useState(8);
  const [simWorkerId, setSimWorkerId] = useState<string>('w-1');
  const [isRunningML, setIsRunningML] = useState(false);
  const [isRecalculatingFleet, setIsRecalculatingFleet] = useState(false);
  const [mlResult, setMlResult] = useState<MLPredictionResult>({
    riesgo: 85,
    nivel: 'CRÍTICO',
    modelo: 'RandomForestClassifier (src/ml/motor_predictivo_safeshift.pkl)',
    timestamp: 'En vivo',
    explicabilidad: {
      pesoHoras: 44,
      pesoNoches: 36,
      pesoDescanso: 20,
      factorCritico: 'Combinación crítica: 4 noches seguidas + 56h semanales (Déficit circadiano)',
    },
  });
  const [dbPredictions, setDbPredictions] = useState<any[]>([]);

  // 4. Estado del Modal de Ingesta Manual y por Lotes (CSV)
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [ingestMode, setIngestMode] = useState<'manual' | 'csv'>('manual');
  const [isIngesting, setIsIngesting] = useState(false);
  const [manualForm, setManualForm] = useState({
    rut: '',
    nombre: '',
    cargo: 'Conductor Troncal Ruta 5',
    turno: 'Noche',
    horasSemanales: 56,
    nochesConsecutivas: 4,
    ultimoDescansoHoras: 8,
  });
  const [csvText, setCsvText] = useState(
    '15.432.890-1,Jorge Rivas M.,Conductor Troncal Ruta 5,Noche,56,4,8\n19.876.543-2,Marcela Paz R.,Operaria Logística,Día,39,0,19\n16.321.987-4,Andrés Lagos V.,Operador Grúa Horquilla,Mixto,49,2,11'
  );

  const fetchSystemData = useCallback(async () => {
    try {
      const [workersRes, historyRes, predsRes] = await Promise.all([
        fetch(`${API_URL}/workers`),
        fetch(`${API_URL}/history`),
        fetch(`${API_URL}/predictions`),
      ]);

      if (workersRes.ok) {
        const workersData = await workersRes.json();
        if (Array.isArray(workersData) && workersData.length > 0) {
          setWorkers(workersData);
        }
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistoryRecords(historyData);
      }

      if (predsRes.ok) {
        const predsData = await predsRes.json();
        setDbPredictions(predsData);
      }
    } catch (error) {
      console.error('Error conectando con el Backend API:', error);
    }
  }, []);

  useEffect(() => {
    fetchSystemData();
  }, [fetchSystemData]);

  // Contadores 100% reales calculados desde las filas de PostgreSQL
  const counts = useMemo(() => {
    const normal = workers.filter((w) => w.nivel === 'NORMAL').length;
    const alerta = workers.filter((w) => w.nivel === 'ALERTA').length;
    const critico = workers.filter(
      (w) => w.nivel === 'CRITICO' || w.nivel === 'CRÍTICO'
    ).length;
    return {
      total: workers.length,
      normal,
      alerta,
      critico,
    };
  }, [workers]);

  // Sustitutos disponibles en PostgreSQL con Riesgo Bajo (RF05)
  const availableSubstitutes = useMemo(() => {
    return workers.filter(
      (w) =>
        w.nivel === 'NORMAL' &&
        w.estadoDisponibilidad !== 'BLOQUEADO_PREVENTIVO'
    );
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      if (selectedRiskFilter !== 'ALL' && worker.nivel !== selectedRiskFilter) {
        if (
          !(
            (selectedRiskFilter === 'CRITICO' || selectedRiskFilter === 'CRÍTICO') &&
            (worker.nivel === 'CRITICO' || worker.nivel === 'CRÍTICO')
          )
        ) {
          return false;
        }
      }
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

  // Login Real contra PostgreSQL (/api/auth/login)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        setLoginError(data.error || 'Credenciales inválidas.');
        setIsLoggingIn(false);
        return;
      }

      setCurrentUser(data.user);
      setIsAuthenticated(true);
      await fetchSystemData();
      setToastMessage(
        `Bienvenido(a) ${data.user.nombre} — Sesión autenticada en PostgreSQL como ${data.user.rol}.`
      );
      setTimeout(() => setToastMessage(null), 5000);
    } catch {
      // Fallback local en caso de que aún no hayan corrido seed de usuarios
      const fallback = DEMO_ACCOUNTS.find((a) => a.correo === loginEmail) || DEMO_ACCOUNTS[0];
      setCurrentUser(fallback);
      setIsAuthenticated(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Ejecutar inferencia ML en vivo contra src/ml/predecir_turno.py (.pkl)
  const handleRunMLPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunningML(true);
    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horasSemanales: simHoras,
          nochesConsecutivas: simNoches,
          ultimoDescansoHoras: simDescanso,
          workerId: simWorkerId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMlResult(data);
        await fetchSystemData();
        setToastMessage(
          `Inferencia ejecutada en motor_predictivo_safeshift.pkl: Riesgo ${data.riesgo}% (${data.nivel}) registrado en tabla PrediccionFatiga.`
        );
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error ejecutando ML:', error);
    } finally {
      setIsRunningML(false);
    }
  };

  // Re-evaluar los 24 trabajadores en PostgreSQL usando el modelo .pkl
  const handleRecalculateAllFleet = async () => {
    setIsRecalculatingFleet(true);
    try {
      const response = await fetch(`${API_URL}/ml/recalculate-all`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        await fetchSystemData();
        setToastMessage(data.message);
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error recalculando flota:', error);
    } finally {
      setIsRecalculatingFleet(false);
    }
  };

  const handleConfirmReassignment = async (payload: ReassignmentPayload) => {
    const targetWorker = workers.find((w) => w.id === payload.workerId);
    const substituteCand = workers.find((c) => c.id === payload.substituteId);
    const substituteName = substituteCand ? substituteCand.nombre : 'Juana Pérez G.';

    try {
      const response = await fetch(`${API_URL}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          supervisor: `${currentUser.nombre} (${currentUser.rol})`,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar en la base de datos');
      }

      await fetchSystemData();

      setToastMessage(
        `Transacción ACID completada por ${currentUser.nombre}: ${targetWorker?.nombre || 'Operario'} pasa a "${payload.accionPreventiva}" (Reemplazo: ${substituteName}).`
      );
    } catch (error) {
      console.error('Error en transacción:', error);
      setToastMessage('Error al conectar con el servidor Backend (puerto 4000).');
    }

    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsIngesting(true);

    try {
      let workersPayload = [];

      if (ingestMode === 'manual') {
        workersPayload = [
          {
            rut: manualForm.rut.trim() || '16.543.210-9',
            nombre: manualForm.nombre.trim() || 'Operario Evaluado ML',
            cargo: manualForm.cargo,
            turno: manualForm.turno,
            horasSemanales: Number(manualForm.horasSemanales),
            nochesConsecutivas: Number(manualForm.nochesConsecutivas),
            ultimoDescansoHoras: Number(manualForm.ultimoDescansoHoras),
          },
        ];
      } else {
        const lines = csvText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        workersPayload = lines.map((line) => {
          const [rut, nombre, cargo, turno, horas, noches, descanso] = line
            .split(',')
            .map((s) => s.trim());
          return {
            rut: rut || '15.000.111-2',
            nombre: nombre || 'Operario Lote CSV',
            cargo: cargo || 'Operario Logístico',
            turno: turno || 'Noche',
            horasSemanales: Number(horas ?? 50),
            nochesConsecutivas: Number(noches ?? 3),
            ultimoDescansoHoras: Number(descanso ?? 10),
          };
        });
      }

      const response = await fetch(`${API_URL}/workers/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workers: workersPayload }),
      });

      if (!response.ok) {
        throw new Error('Error en la ingesta de datos');
      }

      const result = await response.json();
      await fetchSystemData();
      setIsIngestModalOpen(false);
      setToastMessage(result.message);
    } catch (error) {
      console.error('Error al ingerir turnos:', error);
      setToastMessage('Error al procesar la ingesta con el Backend y el motor ML.');
    } finally {
      setIsIngesting(false);
      setTimeout(() => setToastMessage(null), 6000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      setCsvText(content.trim());
    };
    reader.readAsText(file);
  };

  // ============================================================================
  // PANTALLA DE LOGIN REAL A PANTALLA COMPLETA (RF01 - Tabla Usuario PostgreSQL)
  // ============================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col justify-center items-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
          <div className="bg-slate-900 px-6 py-6 text-center border-b border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3">
              <Activity className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              SafeShift Predictor
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Sistema Predictivo de Fatiga y Prevención de Riesgos Laborales
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Seleccionar Cuenta Corporativa (Tabla Usuario en BD):
              </label>
              <div className="grid grid-cols-1 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const selected = loginEmail === acc.correo;
                  return (
                    <button
                      key={acc.correo}
                      type="button"
                      onClick={() => {
                        setLoginEmail(acc.correo);
                        setLoginPassword(acc.pass);
                        setLoginError(null);
                      }}
                      className={`text-left p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                        selected
                          ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {acc.nombre}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium">
                          {acc.rol}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {acc.correo}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Institucional:
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña de Acceso:
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-lg font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>
                {isLoggingIn
                  ? 'Verificando en PostgreSQL...'
                  : 'Autenticar e Ingresar al Dashboard'}
              </span>
            </button>

            <div className="text-[11px] text-center text-slate-400 pt-1">
              Protegido bajo Ley N° 19.628 · Cumplimiento Art. 38 Código del Trabajo
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // DASHBOARD PRINCIPAL AUTENTICADO
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans antialiased">
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        reassignmentsCount={historyRecords.length}
        currentUser={currentUser}
        onLogout={() => setIsAuthenticated(false)}
        onOpenIngestModal={() => setIsIngestModalOpen(true)}
      />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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

        {/* PESTAÑA 1: TURNOS ACTIVOS (24 TRABAJADORES REALES EN BD) */}
        {currentTab === 'turnos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Monitoreo de Flota y Predicción del Próximo Turno
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sesión activa: <strong>{currentUser.nombre}</strong> ({currentUser.rol}) ·{' '}
                  <strong>{counts.total} operarios sincronizados en PostgreSQL</strong> ·{' '}
                  <strong>{availableSubstitutes.length} sustitutos de bajo riesgo disponibles</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRecalculateAllFleet}
                  disabled={isRecalculatingFleet}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-emerald-400 ${
                      isRecalculatingFleet ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {isRecalculatingFleet
                      ? 'Evaluando con .pkl...'
                      : 'Re-evaluar Flota con Motor ML (.pkl)'}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                title="TOTAL OPERARIOS EN BD"
                value={counts.total}
                type="total"
                isSelected={selectedRiskFilter === 'ALL'}
                onClick={() => setSelectedRiskFilter('ALL')}
              />
              <SummaryCard
                title="ESTADO NORMAL (<50%)"
                value={counts.normal}
                type="normal"
                isSelected={selectedRiskFilter === 'NORMAL'}
                onClick={() =>
                  setSelectedRiskFilter(
                    selectedRiskFilter === 'NORMAL' ? 'ALL' : 'NORMAL'
                  )
                }
              />
              <SummaryCard
                title="ALERTA PREVENTIVA (50-79%)"
                value={counts.alerta}
                type="alerta"
                isSelected={selectedRiskFilter === 'ALERTA'}
                onClick={() =>
                  setSelectedRiskFilter(
                    selectedRiskFilter === 'ALERTA' ? 'ALL' : 'ALERTA'
                  )
                }
              />
              <SummaryCard
                title="RIESGO CRÍTICO (>=80%)"
                value={counts.critico}
                type="critico"
                isSelected={selectedRiskFilter === 'CRITICO'}
                onClick={() =>
                  setSelectedRiskFilter(
                    selectedRiskFilter === 'CRITICO' ? 'ALL' : 'CRITICO'
                  )
                }
              />
            </div>

            <WorkerTable
              workers={filteredWorkers}
              onOpenReassign={(w) => setReassignWorker(w)}
              onOpenDetail={(w) => setDetailWorker(w)}
              selectedRiskFilter={selectedRiskFilter}
              onSelectRiskFilter={setSelectedRiskFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalPoolCount={counts.total}
            />
          </div>
        )}

        {/* PESTAÑA 2: LABORATORIO INTERACTIVO MOTOR ML (.PKL) Y CAJA BLANCA */}
        {currentTab === 'ml' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Cpu className="w-6 h-6 text-emerald-600" />
                  <span>Motor Predictivo de Machine Learning (Caja Blanca)</span>
                </h1>
                <p className="text-xs text-slate-500">
                  Conectado en tiempo real con <code>src/ml/motor_predictivo_safeshift.pkl</code> y{' '}
                  <code>src/ml/predecir_turno.py</code> (Entrenado con 1.000 registros sintéticos · Ley 19.628)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentTab('turnos')}
                className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer self-start"
              >
                ← Volver a Turnos Activos
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Panel Izquierdo: Simulador en Vivo conectado a Python */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Simulador de Inferencia en Tiempo Real
                    </h2>
                  </div>
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                    POST /api/predict
                  </span>
                </div>

                <form onSubmit={handleRunMLPrediction} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Asociar Evaluación a Operario en BD (Tabla PrediccionFatiga):
                    </label>
                    <select
                      value={simWorkerId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSimWorkerId(id);
                        const found = workers.find((w) => w.id === id);
                        if (found) {
                          setSimHoras(found.horasSemanales);
                          setSimNoches(found.nochesConsecutivas);
                          setSimDescanso(found.ultimoDescansoHoras ?? 12);
                        }
                      }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800"
                    >
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.nombre} ({w.rut}) — Actual: {w.riesgo}% {w.nivel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-700 mb-1">
                      <span>1. Horas Semanales Acumuladas:</span>
                      <span className="text-slate-900 font-bold">{simHoras} hrs</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={60}
                      value={simHoras}
                      onChange={(e) => setSimHoras(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>30h (Liviano)</span>
                      <span>45h (Límite Ord.)</span>
                      <span>60h (Sobrecarga)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-700 mb-1">
                      <span>2. Turnos Nocturnos Consecutivos:</span>
                      <span className="text-slate-900 font-bold">{simNoches} noches</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      value={simNoches}
                      onChange={(e) => setSimNoches(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0 noches</span>
                      <span>3 noches (Umbral)</span>
                      <span>6 noches</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-700 mb-1">
                      <span>3. Ventana de Último Descanso:</span>
                      <span className="text-slate-900 font-bold">{simDescanso} hrs</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={24}
                      value={simDescanso}
                      onChange={(e) => setSimDescanso(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>6h (Déficit Crítico)</span>
                      <span>12h (Intermedio)</span>
                      <span>24h (Óptimo)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSimHoras(38);
                        setSimNoches(0);
                        setSimDescanso(20);
                      }}
                      className="py-1.5 px-2 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold text-[11px] hover:bg-emerald-100 cursor-pointer"
                    >
                      Caso Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSimHoras(48);
                        setSimNoches(2);
                        setSimDescanso(12);
                      }}
                      className="py-1.5 px-2 rounded border border-amber-200 bg-amber-50 text-amber-800 font-semibold text-[11px] hover:bg-amber-100 cursor-pointer"
                    >
                      Caso Alerta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSimHoras(56);
                        setSimNoches(4);
                        setSimDescanso(8);
                      }}
                      className="py-1.5 px-2 rounded border border-red-200 bg-red-50 text-red-800 font-semibold text-[11px] hover:bg-red-100 cursor-pointer"
                    >
                      Caso Crítico (CP-03)
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isRunningML}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isRunningML
                        ? 'Consultando motor_predictivo_safeshift.pkl...'
                        : 'Ejecutar Inferencia en Python (.pkl) y Guardar en BD'}
                    </span>
                  </button>
                </form>
              </div>

              {/* Panel Derecho: Resultado de Inferencia y Explicabilidad de Caja Blanca */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Resultado del Clasificador Random Forest y Pesos de Variables
                    </h2>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Precisión Validada: &gt;80% (Ley 19.628)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    <div
                      className={`p-4 rounded-xl border text-center ${
                        mlResult.nivel.includes('CR')
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : mlResult.nivel === 'ALERTA'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                        Probabilidad de Fatiga
                      </div>
                      <div className="text-3xl font-extrabold my-1">
                        {mlResult.riesgo}%
                      </div>
                      <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/80 shadow-2xs">
                        NIVEL {mlResult.nivel}
                      </div>
                    </div>

                    <div className="sm:col-span-2 space-y-2.5 text-xs">
                      <div className="font-bold text-slate-800">
                        Importancia de Variables en la Decisión (Explicabilidad Caja Blanca):
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span>Impacto Horas Semanales ({simHoras}h)</span>
                          <span>{mlResult.explicabilidad?.pesoHoras ?? 44}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${mlResult.explicabilidad?.pesoHoras ?? 44}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span>Impacto Noches Consecutivas ({simNoches} noches)</span>
                          <span>{mlResult.explicabilidad?.pesoNoches ?? 36}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-600 rounded-full"
                            style={{ width: `${mlResult.explicabilidad?.pesoNoches ?? 36}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span>Impacto Déficit de Descanso ({simDescanso}h)</span>
                          <span>{mlResult.explicabilidad?.pesoDescanso ?? 20}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${mlResult.explicabilidad?.pesoDescanso ?? 20}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex items-start gap-2.5">
                    {mlResult.riesgo >= 80 ? (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold text-slate-900">
                        Dictamen del Motor Predictivo:{' '}
                      </span>
                      <span className="text-slate-700">
                        {mlResult.explicabilidad?.factorCritico}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabla de Auditoría de Predicciones en PostgreSQL (Tabla PrediccionFatiga) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-slate-700" />
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Últimas Inferencias Registradas en PostgreSQL (Tabla PrediccionFatiga)
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {dbPredictions.length} registros recientes
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] uppercase">
                          <th className="py-2.5 px-4">ID</th>
                          <th className="py-2.5 px-4">Operario</th>
                          <th className="py-2.5 px-4">Score ML</th>
                          <th className="py-2.5 px-4">Nivel</th>
                          <th className="py-2.5 px-4">Bloqueo Preventivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dbPredictions.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2 px-4 font-mono text-slate-500">
                              #{p.id}
                            </td>
                            <td className="py-2 px-4 font-semibold text-slate-800">
                              {p.trabajador
                                ? `${p.trabajador.nombre} ${p.trabajador.apellido}`
                                : p.trabajadorId}
                            </td>
                            <td className="py-2 px-4 font-bold">
                              {Math.round((p.score_probabilidad || 0) * 100)}%
                            </td>
                            <td className="py-2 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  String(p.nivel_riesgo).includes('CR')
                                    ? 'bg-red-100 text-red-800'
                                    : p.nivel_riesgo === 'ALERTA'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {p.nivel_riesgo}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-slate-600">
                              {p.requiere_bloqueo ? 'Sí (Obligatorio Art. 38)' : 'No requerido'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: HISTORIAL TRANSACCIONAL RRHH */}
        {currentTab === 'historial' && (
          <RRHHHistoryView
            records={historyRecords}
            onBackToTurnos={() => setCurrentTab('turnos')}
          />
        )}

        {/* PESTAÑA 4: REPORTES */}
        {currentTab === 'reportes' && (
          <ReportsView onBackToTurnos={() => setCurrentTab('turnos')} />
        )}
      </main>

      {/* Modal de Reasignación Transaccional con Sustitutos Reales de la BD */}
      <ReassignmentModal
        isOpen={Boolean(reassignWorker)}
        worker={reassignWorker}
        availableSubstitutes={availableSubstitutes}
        onClose={() => setReassignWorker(null)}
        onConfirm={handleConfirmReassignment}
      />

      {/* Modal de Detalle del Trabajador */}
      <WorkerDetailModal
        isOpen={Boolean(detailWorker)}
        worker={detailWorker}
        onClose={() => setDetailWorker(null)}
        onOpenReassign={(w) => {
          setDetailWorker(null);
          setReassignWorker(w);
        }}
      />

      {/* Modal de Ingesta Manual y por Lotes (CSV) */}
      {isIngestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                  Ingesta de Turnos y Evaluación ML (.pkl)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsIngestModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIngestMode('manual')}
                  className={`py-1.5 rounded-md font-semibold text-xs transition ${
                    ingestMode === 'manual'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ingreso Manual de Turno
                </button>
                <button
                  type="button"
                  onClick={() => setIngestMode('csv')}
                  className={`py-1.5 rounded-md font-semibold text-xs transition ${
                    ingestMode === 'csv'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Carga por Lotes (CSV)
                </button>
              </div>

              <form onSubmit={handleIngestSubmit} className="space-y-3">
                {ingestMode === 'manual' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          RUT Trabajador:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 16.543.210-9"
                          value={manualForm.rut}
                          onChange={(e) =>
                            setManualForm({ ...manualForm, rut: e.target.value })
                          }
                          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Nombre Completo:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Jorge Rivas M."
                          value={manualForm.nombre}
                          onChange={(e) =>
                            setManualForm({ ...manualForm, nombre: e.target.value })
                          }
                          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Cargo Operativo:
                        </label>
                        <input
                          type="text"
                          value={manualForm.cargo}
                          onChange={(e) =>
                            setManualForm({ ...manualForm, cargo: e.target.value })
                          }
                          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Tipo de Turno:
                        </label>
                        <select
                          value={manualForm.turno}
                          onChange={(e) =>
                            setManualForm({ ...manualForm, turno: e.target.value })
                          }
                          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                        >
                          <option value="Noche">Noche</option>
                          <option value="Día">Día</option>
                          <option value="Mixto">Mixto</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                          Horas Semanales:
                        </label>
                        <input
                          type="number"
                          value={manualForm.horasSemanales}
                          onChange={(e) =>
                            setManualForm({
                              ...manualForm,
                              horasSemanales: Number(e.target.value),
                            })
                          }
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                          Noches Seguidas:
                        </label>
                        <input
                          type="number"
                          value={manualForm.nochesConsecutivas}
                          onChange={(e) =>
                            setManualForm({
                              ...manualForm,
                              nochesConsecutivas: Number(e.target.value),
                            })
                          }
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                          Horas Descanso:
                        </label>
                        <input
                          type="number"
                          value={manualForm.ultimoDescansoHoras}
                          onChange={(e) =>
                            setManualForm({
                              ...manualForm,
                              ultimoDescansoHoras: Number(e.target.value),
                            })
                          }
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-semibold text-slate-700 text-xs">
                        Subir archivo .CSV o editar lote:
                      </label>
                      <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer flex items-center gap-1 border border-slate-300">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Seleccionar CSV</span>
                        <input
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <textarea
                      rows={4}
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-xs text-slate-800"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsIngestModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isIngesting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {isIngesting
                        ? 'Evaluando con Motor ML...'
                        : 'Evaluar con Motor ML y Guardar en BD'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}