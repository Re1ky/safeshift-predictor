import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { execFile } from 'node:child_process';
import path from 'node:path';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Función auxiliar que invoca el modelo .pkl en Python (con respaldo matemático)
function predecirFatigaML(
  horasSemanales: number,
  nochesConsecutivas: number,
  horasDescanso: number,
): Promise<{ riesgo: number; nivel: string }> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'src', 'ml', 'predecir_turno.py');
    const args = [
      scriptPath,
      String(horasSemanales),
      String(nochesConsecutivas),
      String(horasDescanso),
    ];

    execFile('python', args, { timeout: 5000 }, (error, stdout) => {
      if (!error && stdout) {
        try {
          const parsed = JSON.parse(stdout.trim());
          if (typeof parsed.riesgo === 'number' && parsed.nivel) {
            return resolve(parsed);
          }
        } catch {
          // Continúa al cálculo de respaldo si el JSON falla
        }
      }

      const puntaje =
        horasSemanales * 1.1 + nochesConsecutivas * 9 - horasDescanso * 1.5;
      const riesgo = Math.max(5, Math.min(98, Math.round(puntaje)));
      const nivel =
        riesgo >= 80 ? 'CRÍTICO' : riesgo >= 50 ? 'ALERTA' : 'NORMAL';
      resolve({ riesgo, nivel });
    });
  });
}

// 1. Obtener lista de trabajadores y sus turnos desde PostgreSQL
app.get('/api/workers', async (_req, res) => {
  try {
    const dbWorkers = await prisma.trabajador.findMany({
      include: {
        turnos: {
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
    });

    const formattedWorkers = dbWorkers.map((w) => {
      const turnoActual = w.turnos[0];
      return {
        id: w.id,
        rut: w.rut,
        nombre: `${w.nombre} ${w.apellido}`.trim(),
        cargo: w.cargo,
        turno: (turnoActual?.tipo_turno || 'Noche') as 'Noche' | 'Día' | 'Mixto',
        horasSemanales: turnoActual?.horas_acumuladas_semana ?? 45,
        nochesConsecutivas: turnoActual?.noches_consecutivas ?? 0,
        riesgo: w.riesgo,
        nivel: w.nivel_riesgo,
        estadoDisponibilidad: w.estado_disponibilidad,
        ultimoDescansoHoras: w.ultimo_descanso_horas,
        sustitutoAsignado: w.sustituto_asignado || undefined,
        accionPreventiva: w.accion_preventiva || undefined,
        motivoReasignacion: w.motivo_reasignacion || undefined,
        fechaReasignacion: w.fecha_reasignacion || undefined,
      };
    });

    res.json(formattedWorkers);
  } catch (error) {
    console.error('Error al obtener trabajadores:', error);
    res.status(500).json({ error: 'Error al consultar trabajadores en la BD' });
  }
});

// 2. Obtener el historial transaccional de RRHH (Art. 38)
app.get('/api/history', async (_req, res) => {
  try {
    const records = await prisma.historialReasignacion.findMany({
      orderBy: { id: 'desc' },
    });

    const formattedHistory = records.map((r) => ({
      id: `hist-${r.id}`,
      fecha: r.fecha,
      trabajadorOrigen: r.trabajadorOrigen,
      rutOrigen: r.rutOrigen,
      trabajadorReemplazo: r.trabajadorReemplazo,
      accion: r.accion,
      motivo: r.motivo,
      supervisor: r.supervisor,
    }));

    res.json(formattedHistory);
  } catch (error) {
    console.error('Error al obtener historial RRHH:', error);
    res.status(500).json({ error: 'Error al consultar historial en la BD' });
  }
});

// 3. Ejecutar Reasignación Preventiva (Transacción ACID en Base de Datos)
app.post('/api/reassign', async (req, res) => {
  const { workerId, accionPreventiva, substituteId, motivo } = req.body;

  try {
    const targetWorker = await prisma.trabajador.findUnique({
      where: { id: workerId },
    });

    if (!targetWorker) {
      return res.status(404).json({ error: 'Trabajador no encontrado en la BD' });
    }

    const substituteWorker = await prisma.trabajador.findUnique({
      where: { id: substituteId },
    });

    const substituteName = substituteWorker
      ? `${substituteWorker.nombre} ${substituteWorker.apellido}`.trim()
      : 'Juana Pérez G.';

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const horaCorta = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const resultado = await prisma.$transaction(async (tx) => {
      const updatedWorker = await tx.trabajador.update({
        where: { id: workerId },
        data: {
          estado_disponibilidad: 'BLOQUEADO_PREVENTIVO',
          accion_preventiva: accionPreventiva,
          sustituto_asignado: substituteName,
          motivo_reasignacion: motivo,
          fecha_reasignacion: horaCorta,
        },
      });

      await tx.turno.updateMany({
        where: { trabajadorId: workerId, estado_turno: 'ACTIVO' },
        data: { estado_turno: 'REASIGNADO' },
      });

      const newHistory = await tx.historialReasignacion.create({
        data: {
          fecha: formattedDate,
          trabajadorId: workerId,
          trabajadorOrigen: `${targetWorker.nombre} ${targetWorker.apellido}`.trim(),
          rutOrigen: targetWorker.rut,
          trabajadorReemplazo: substituteName,
          accion: accionPreventiva,
          motivo: motivo,
          supervisor: 'Supervisor de Turno',
        },
      });

      return { updatedWorker, newHistory };
    });

    console.log(
      `[TRANSACCIÓN EXITOSA] Trabajador ${targetWorker.rut} actualizado a BLOQUEADO_PREVENTIVO. Sustituto: ${substituteName}`
    );

    res.json({
      ok: true,
      message: 'Reasignación guardada en PostgreSQL',
      data: resultado,
    });
  } catch (error) {
    console.error('Error en transacción de reasignación:', error);
    res.status(500).json({ error: 'No se pudo completar la transacción en la BD' });
  }
});

// 4. Endpoint directo al Motor Predictivo ML (.pkl)
app.post('/api/predict', async (req, res) => {
  const { horasSemanales = 45, nochesConsecutivas = 0, ultimoDescansoHoras = 16 } = req.body;
  const prediccion = await predecirFatigaML(
    Number(horasSemanales),
    Number(nochesConsecutivas),
    Number(ultimoDescansoHoras),
  );
  res.json(prediccion);
});

// 5. Módulo de Ingesta Manual o por Lotes (CSV) conectado al modelo ML y PostgreSQL
app.post('/api/workers/ingest', async (req, res) => {
  try {
    const listaEntrada = Array.isArray(req.body.workers) ? req.body.workers : [req.body];
    const procesados = [];

    for (const item of listaEntrada) {
      const horasSemanales = Number(item.horasSemanales ?? 45);
      const nochesConsecutivas = Number(item.nochesConsecutivas ?? 0);
      const ultimoDescansoHoras = Number(item.ultimoDescansoHoras ?? 16);

      const prediccion = await predecirFatigaML(
        horasSemanales,
        nochesConsecutivas,
        ultimoDescansoHoras,
      );

      const partesNombre = String(item.nombre || 'Operario Nuevo').trim().split(' ');
      const nombre = partesNombre[0] || 'Operario';
      const apellido = partesNombre.slice(1).join(' ') || 'Turno';
      const rut = String(item.rut || `${Math.floor(15000000 + Math.random() * 9000000)}-K`);

      const trabajadorGuardado = await prisma.trabajador.upsert({
        where: { rut },
        update: {
          nombre,
          apellido,
          cargo: item.cargo || 'Operario Logístico',
          riesgo: prediccion.riesgo,
          nivel_riesgo: prediccion.nivel,
          ultimo_descanso_horas: ultimoDescansoHoras,
          estado_disponibilidad: prediccion.nivel === 'CRÍTICO' ? 'EN_TURNO' : 'DISPONIBLE',
        },
        create: {
          rut,
          nombre,
          apellido,
          cargo: item.cargo || 'Operario Logístico',
          riesgo: prediccion.riesgo,
          nivel_riesgo: prediccion.nivel,
          ultimo_descanso_horas: ultimoDescansoHoras,
          estado_disponibilidad: prediccion.nivel === 'CRÍTICO' ? 'EN_TURNO' : 'DISPONIBLE',
          turnos: {
            create: {
              tipo_turno: item.turno || 'Noche',
              fecha_inicio: new Date(),
              fecha_fin: new Date(Date.now() + 8 * 60 * 60 * 1000),
              horas_acumuladas_semana: horasSemanales,
              noches_consecutivas: nochesConsecutivas,
              descansos_compensatorios: ultimoDescansoHoras >= 16 ? 2 : 0,
              estado_turno: 'ACTIVO',
            },
          },
        },
      });

      procesados.push({ ...trabajadorGuardado, prediccion });
    }

    res.json({
      ok: true,
      message: `${procesados.length} trabajador(es) evaluados por el motor ML y registrados en BD.`,
      data: procesados,
    });
  } catch (error) {
    console.error('Error en ingesta de turnos:', error);
    res.status(500).json({ error: 'Error al procesar e insertar turnos en la BD' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
});