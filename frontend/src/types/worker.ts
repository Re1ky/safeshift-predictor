export type RiskLevel = 'NORMAL' | 'ALERTA' | 'CRITICO' | 'CRÍTICO';

export type ShiftType = 'Noche' | 'Día' | 'Mixto';

export type WorkerStatus =
  | 'DISPONIBLE'
  | 'BLOQUEADO_FATIGA'
  | 'BLOQUEADO_PREVENTIVO'
  | 'EN_TURNO'
  | 'REASIGNADO';

export interface Worker {
  id: string;
  rut: string;
  nombre: string;
  cargo: string;
  turno: ShiftType;
  horasSemanales: number;
  nochesConsecutivas: number;
  riesgo: number; // percentage (0 - 100)
  nivel: RiskLevel;
  estadoDisponibilidad: WorkerStatus;
  ultimoDescansoHoras?: number;
  sustitutoAsignado?: string;
  accionPreventiva?: string;
  motivoReasignacion?: string;
  fechaReasignacion?: string;
}

export interface ReassignmentPayload {
  workerId: string;
  accionPreventiva: string;
  substituteId: string;
  motivo: string;
}
