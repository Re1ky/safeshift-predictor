import React from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  Download,
  FileText,
  UserCheck,
  Clock,
  CheckCircle2,
} from 'lucide-react';

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

export function RRHHHistoryView({
  records,
  onBackToTurnos,
}: RRHHHistoryViewProps) {
  // Función que genera y descarga el archivo CSV codificado en UTF-8 con BOM para Excel
  const handleExportCSV = () => {
    const headers = [
      'ID_Registro',
      'Fecha_Hora',
      'Trabajador_Bloqueado',
      'RUT_Trabajador',
      'Sustituto_Asignado',
      'Medida_Preventiva',
      'Motivo_Legal_Art38',
      'Supervisor_Autorizador',
    ];

    const escapeCSV = (val: string) =>
      `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = records.map((r) =>
      [
        escapeCSV(r.id),
        escapeCSV(r.fecha),
        escapeCSV(r.trabajadorOrigen),
        escapeCSV(r.rutOrigen),
        escapeCSV(r.trabajadorReemplazo),
        escapeCSV(r.accion),
        escapeCSV(r.motivo),
        escapeCSV(r.supervisor),
      ].join(';')
    );

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Auditoria_RRHH_Art38_SafeShift.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera de la vista con botón de Exportación CSV */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Historial Transaccional RRHH y Cumplimiento Art. 38
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registro inmutable de bloqueos preventivos y reasignaciones auditables ante la Dirección del Trabajo (PostgreSQL).
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Auditoría RRHH (.CSV)</span>
          </button>

          <button
            type="button"
            onClick={onBackToTurnos}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Turnos Activos</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de resumen normativo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Intervenciones (BD)
            </p>
            <p className="text-xl font-bold text-slate-900">
              {records.length} registros
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Normativa Aplicada
            </p>
            <p className="text-sm font-bold text-slate-900">
              Art. 38 Código del Trabajo
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Persistencia Transaccional
            </p>
            <p className="text-sm font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>ACID Verificado (Prisma ORM)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Historial RRHH */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
            Bitácora de Reasignaciones y Bloqueos Preventivos
          </h2>
          <span className="text-[11px] font-semibold text-slate-500">
            Tabla: <code>HistorialReasignacion</code>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-bold uppercase text-slate-600">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Fecha / Hora</th>
                <th className="py-3 px-4">Trabajador Bloqueado</th>
                <th className="py-3 px-4">Sustituto Asignado</th>
                <th className="py-3 px-4">Medida Preventiva</th>
                <th className="py-3 px-4">Motivo / Fundamento Legal</th>
                <th className="py-3 px-4">Autorizado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono text-xs text-slate-500">
                    {rec.id}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                    {rec.fecha}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">
                      {rec.trabajadorOrigen}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      RUT: {rec.rutOrigen}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      {rec.trabajadorReemplazo}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                      {rec.accion}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs">
                    {rec.motivo}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                    {rec.supervisor}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-slate-400 text-xs"
                  >
                    No hay registros de reasignación en la base de datos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}