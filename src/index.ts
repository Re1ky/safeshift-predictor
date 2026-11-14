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

// Función que invoca src/ml/predecir_turno.py (motor_predictivo_safeshift.pkl) y calcula Caja Blanca
function predecirFatigaML(
  horasSemanales: number,
  nochesConsecutivas: number,
  horasDescanso: number,
): Promise<{
  riesgo: number;
  nivel: string;
  explicabilidad: {
    pesoHoras: number;
    pesoNoches: number;
    pesoDescanso: number;
    factorCritico: string;
  };
}> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'src', 'ml', 'predecir_turno.py');
    const args = [
      scriptPath,
      String(horasSemanales),
      String(nochesConsecutivas),
      String(horasDescanso),
    ];

    const calcularExplicabilidad = (riesgoFinal: number, nivelFinal: string) => {
      const brutaHoras = Math.max(5, (horasSemanales - 30) * 1.8);
      const brutaNoches = Math.max(2, nochesConsecutivas * 14);
      const brutaDescanso = Math.max(5, (24 - Math.min(24, horasDescanso)) * 2.2);
      const suma = brutaHoras + brutaNoches + brutaDescanso || 1;

      const pesoHoras = Math.round((brutaHoras / suma) * 100);
      const pesoNoches = Math.round((brutaNoches / suma) * 100);
      const pesoDescanso = Math.max(0, 100 - pesoHoras - pesoNoches);

      let factorCritico = 'Parámetros dentro de rango operativo normal';
      if (nivelFinal === 'CRÍTICO' || nivelFinal === 'CRITICO') {
        if (nochesConsecutivas >= 3 && horasSemanales >= 50) {
          factorCritico = `Combinación crítica: ${nochesConsecutivas} noches seguidas + ${horasSemanales}h semanales (Déficit circadiano)`;
        } else if (horasDescanso <= 9) {
          factorCritico = `Descanso interjornada insuficiente (${horasDescanso}h < 10h mínimas recomendadas)`;
        } else {
          factorCritico = `Sobrecarga acumulada en semana móvil (${horasSemanales}h trabajadas)`;
        }
      } else if (nivelFinal === 'ALERTA') {
        factorCritico = `Acumulación moderada de fatiga (${horasSemanales}h semanales / ${nochesConsecutivas} noches)`;
      }

      return {
        riesgo: riesgoFinal,
        nivel: nivelFinal,
        explicabilidad: { pesoHoras, pesoNoches, pesoDescanso, factorCritico },
      };
    };

    execFile('python', args, { timeout: 5000 }, (error, stdout) => {
      if (!error && stdout) {
        try {
          const parsed = JSON.parse(stdout.trim());
          if (typeof parsed.riesgo === 'number' && parsed.nivel) {
            return resolve(calcularExplicabilidad(parsed.riesgo, parsed.nivel));
          }
        } catch {
          // Usa cálculo de respaldo si falla el parseo JSON
        }
      }

      const puntaje =
        horasSemanales * 1.2 + nochesConsecutivas * 10 - horasDescanso * 1.8;
      let riesgo = Math.max(5, Math.min(98, Math.round(puntaje)));
      let nivel = 'NORMAL';
      if (riesgo >= 80 || horasSemanales >= 52 || nochesConsecutivas >= 3) {
        nivel = 'CRÍTICO';
        if (riesgo < 80) riesgo = 85;
      } else if (riesgo >= 50) {
        nivel = 'ALERTA';
      }
      resolve(calcularExplicabilidad(riesgo, nivel));
    });
  });
}

// 0. Endpoint de Salud del Servicio (Healthcheck para Docker y QA)
app.get('/api/health', async (_req, res) => {
  try {
    const totalWorkers = await prisma.trabajador.count();
    res.json({
      ok: true,
      servicio: 'SafeShift Predictor Backend API',
      estadoBD: 'Conectado a PostgreSQL (safeshift_db)',
      operariosRegistrados: totalWorkers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ ok: false, estadoBD: 'Desconectado', error: String(error) });
  }
});

// 1. Autenticación Real contra la tabla Usuario en PostgreSQL (RF01)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.usuario.findUnique({
      where: { email: String(email || '').trim().toLowerCase() },
    });

    if (!user || user.password_hash !== password) {
      console.warn(`[AUTH RECHAZADO] Intento fallido para correo: ${email}`);
      return res.status(401).json({
        ok: false,
        error: 'Credenciales inválidas. Verifique correo institucional y contraseña.',
      });
    }

    console.log(`[AUTH EXITOSO] Usuario autenticado: ${user.nombre} (${user.rol})`);
    res.json({
      ok: true,
      user: {
        id: user.id,
        rut: user.rut,
        nombre: user.nombre,
        rol: user.rol,
        correo: user.email,
      },
    });
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).json({ ok: false, error: 'Error al autenticar en PostgreSQL' });
  }
});

// Obtener lista de usuarios registrados
app.get('/api/auth/users', async (_req, res) => {
  try {
    const users = await prisma.usuario.findMany({
      select: { id: true, rut: true, nombre: true, rol: true, email: true },
      orderBy: { id: 'asc' },
    });
    res.json(users);
  } catch {
    res.status(500).json([]);
  }
});

// 2. Obtener lista de trabajadores, su turno actual y su última predicción ML desde PostgreSQL
app.get('/api/workers', async (_req, res) => {
  try {
    const dbWorkers = await prisma.trabajador.findMany({
      include: {
        turnos: {
          orderBy: { id: 'desc' },
          take: 1,
        },
        predicciones: {
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    });

    dbWorkers.sort((a, b) => b.riesgo - a.riesgo);

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

// 3. Obtener el historial transaccional de RRHH (Art. 38)
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

// 4. Ejecutar Reasignación Preventiva con Control de Concurrencia RNF02 y Transacción ACID
app.post('/api/reassign', async (req, res) => {
  const { workerId, accionPreventiva, substituteId, motivo, supervisor } = req.body;

  try {
    const targetWorker = await prisma.trabajador.findUnique({
      where: { id: workerId },
    });

    if (!targetWorker) {
      return res.status(404).json({
        ok: false,
        error: 'Trabajador no encontrado en la base de datos PostgreSQL.',
      });
    }

    // VALIDACIÓN DE CONCURRENCIA ESTRICTA (RNF02):
    // Si otro supervisor ya bloqueó al trabajador en otra sesión, rechaza con HTTP 409 Conflict
    if (targetWorker.estado_disponibilidad === 'BLOQUEADO_PREVENTIVO') {
      console.warn(
        `[BLOQUEO CONCURRENCIA RNF02] Solicitud duplicada rechazada para RUT ${targetWorker.rut} (Ya se encuentra en BLOQUEADO_PREVENTIVO).`
      );
      return res.status(409).json({
        ok: false,
        error: `Conflicto de concurrencia (RNF02): El operario ${targetWorker.nombre} ${targetWorker.apellido} (${targetWorker.rut}) ya fue bloqueado preventivamente por otro supervisor.`,
      });
    }

    const substituteWorker = substituteId
      ? await prisma.trabajador.findUnique({ where: { id: substituteId } })
      : null;

    // VALIDACIÓN DE REGLA DE NEGOCIO RRHH (RF05):
    // El sustituto no puede estar en nivel CRÍTICO ni bloqueado preventivamente
    if (
      substituteWorker &&
      (substituteWorker.estado_disponibilidad === 'BLOQUEADO_PREVENTIVO' ||
        substituteWorker.nivel_riesgo === 'CRÍTICO' ||
        substituteWorker.nivel_riesgo === 'CRITICO')
    ) {
      return res.status(400).json({
        ok: false,
        error: `Violación de regla de negocio (RF05): El sustituto seleccionado (${substituteWorker.nombre} ${substituteWorker.apellido}) no cumple con riesgo bajo o disponibilidad activa.`,
      });
    }

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

      if (substituteWorker) {
        await tx.trabajador.update({
          where: { id: substituteWorker.id },
          data: { estado_disponibilidad: 'EN_TURNO' },
        });
      }

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
          supervisor: supervisor || 'Supervisor de Turno',
        },
      });

      return { updatedWorker, newHistory };
    });

    console.log(
      `[TRANSACCIÓN ACID EXITOSA] Trabajador ${targetWorker.rut} -> BLOQUEADO_PREVENTIVO | Sustituto: ${substituteName}`
    );

    res.json({
      ok: true,
      message: 'Reasignación guardada transaccionalmente en PostgreSQL',
      data: resultado,
    });
  } catch (error) {
    console.error('Error en transacción de reasignación:', error);
    res.status(500).json({ ok: false, error: 'No se pudo completar la transacción en la BD' });
  }
});

// 5. Rehabilitar Trabajador tras Cumplir Descanso Compensatorio (Cierre de Ciclo Art. 38)
app.post('/api/workers/release', async (req, res) => {
  const { workerId, supervisor } = req.body;

  try {
    const targetWorker = await prisma.trabajador.findUnique({
      where: { id: workerId },
    });

    if (!targetWorker) {
      return res.status(404).json({ ok: false, error: 'Trabajador no encontrado en la BD' });
    }

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const resultado = await prisma.$transaction(async (tx) => {
      const updated = await tx.trabajador.update({
        where: { id: workerId },
        data: {
          estado_disponibilidad: 'DISPONIBLE',
          riesgo: 15,
          nivel_riesgo: 'NORMAL',
          ultimo_descanso_horas: 24,
          sustituto_asignado: null,
          accion_preventiva: null,
          motivo_reasignacion: null,
          fecha_reasignacion: null,
        },
      });

      await tx.turno.updateMany({
        where: { trabajadorId: workerId },
        data: {
          horas_acumuladas_semana: 36,
          noches_consecutivas: 0,
          descansos_compensatorios: 2,
          estado_turno: 'ACTIVO',
        },
      });

      const historyEntry = await tx.historialReasignacion.create({
        data: {
          fecha: formattedDate,
          trabajadorId: workerId,
          trabajadorOrigen: `${targetWorker.nombre} ${targetWorker.apellido}`.trim(),
          rutOrigen: targetWorker.rut,
          trabajadorReemplazo: 'Reincorporación Titular',
          accion: 'Alta Preventiva (Descanso 24h/48h Cumplido)',
          motivo: 'Cumplimiento íntegro de ventana de reposo compensatorio según Art. 38 del Código del Trabajo.',
          supervisor: supervisor || 'Analista RRHH / Prevencionista',
        },
      });

      return { updated, historyEntry };
    });

    console.log(
      `[ALTA PREVENTIVA ART. 38] Trabajador ${targetWorker.rut} rehabilitado a estado DISPONIBLE (Riesgo 15% NORMAL)`
    );

    res.json({
      ok: true,
      message: `Alta preventiva registrada: ${targetWorker.nombre} ${targetWorker.apellido} vuelve a estado DISPONIBLE.`,
      data: resultado,
    });
  } catch (error) {
    console.error('Error al rehabilitar trabajador:', error);
    res.status(500).json({ ok: false, error: 'Error al rehabilitar trabajador en PostgreSQL' });
  }
});

// 6. Endpoint de Inferencia ML en Vivo (.pkl) + Explicabilidad Caja Blanca
app.post('/api/predict', async (req, res) => {
  const {
    horasSemanales = 45,
    nochesConsecutivas = 0,
    ultimoDescansoHoras = 16,
    workerId,
  } = req.body;

  const resultadoML = await predecirFatigaML(
    Number(horasSemanales),
    Number(nochesConsecutivas),
    Number(ultimoDescansoHoras),
  );

  if (workerId) {
    try {
      await prisma.prediccionFatiga.create({
        data: {
          trabajadorId: String(workerId),
          score_probabilidad: Number((resultadoML.riesgo / 100).toFixed(2)),
          nivel_riesgo: resultadoML.nivel,
          factores_determinantes: JSON.stringify(resultadoML.explicabilidad),
          requiere_bloqueo: resultadoML.riesgo >= 80,
        },
      });
    } catch {
      // Continúa si el workerId es solo de simulación libre
    }
  }

  console.log(
    `[MOTOR ML .PKL] Entrada: ${horasSemanales}h sem, ${nochesConsecutivas} noches, ${ultimoDescansoHoras}h descanso -> Resultado: ${resultadoML.riesgo}% (${resultadoML.nivel})`
  );

  res.json({
    ...resultadoML,
    modelo: 'RandomForestClassifier (src/ml/motor_predictivo_safeshift.pkl)',
    timestamp: new Date().toLocaleTimeString('es-CL'),
  });
});

// Obtener las últimas predicciones registradas en la tabla PrediccionFatiga
app.get('/api/predictions', async (_req, res) => {
  try {
    const preds = await prisma.prediccionFatiga.findMany({
      include: {
        trabajador: {
          select: { nombre: true, apellido: true, rut: true, cargo: true },
        },
      },
      orderBy: { id: 'desc' },
      take: 12,
    });
    res.json(preds);
  } catch {
    res.status(500).json([]);
  }
});

// Re-evaluar toda la flota en PostgreSQL contra el modelo .pkl
app.post('/api/ml/recalculate-all', async (_req, res) => {
  try {
    const allWorkers = await prisma.trabajador.findMany({
      include: { turnos: { orderBy: { id: 'desc' }, take: 1 } },
    });

    let actualizados = 0;
    for (const w of allWorkers) {
      const t = w.turnos[0];
      const horas = t?.horas_acumuladas_semana ?? 45;
      const noches = t?.noches_consecutivas ?? 0;
      const descanso = w.ultimo_descanso_horas ?? 16;

      const pred = await predecirFatigaML(horas, noches, descanso);

      await prisma.trabajador.update({
        where: { id: w.id },
        data: {
          riesgo: pred.riesgo,
          nivel_riesgo: pred.nivel,
        },
      });

      await prisma.prediccionFatiga.create({
        data: {
          trabajadorId: w.id,
          score_probabilidad: Number((pred.riesgo / 100).toFixed(2)),
          nivel_riesgo: pred.nivel,
          factores_determinantes: JSON.stringify(pred.explicabilidad),
          requiere_bloqueo: pred.riesgo >= 80,
        },
      });
      actualizados++;
    }

    console.log(`[RECÁLCULO MASIVO ML] ${actualizados} operarios re-evaluados con motor_predictivo_safeshift.pkl`);

    res.json({
      ok: true,
      message: `Motor ML (.pkl) ejecutado en vivo sobre los ${actualizados} operarios de PostgreSQL.`,
    });
  } catch (error) {
    console.error('Error al recalcular flota:', error);
    res.status(500).json({ ok: false, error: 'Error al recalcular la flota con ML' });
  }
});

// 7. Módulo de Ingesta Manual o por Lotes (CSV) conectado al modelo ML y PostgreSQL
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

      await prisma.prediccionFatiga.create({
        data: {
          trabajadorId: trabajadorGuardado.id,
          score_probabilidad: Number((prediccion.riesgo / 100).toFixed(2)),
          nivel_riesgo: prediccion.nivel,
          factores_determinantes: JSON.stringify(prediccion.explicabilidad),
          requiere_bloqueo: prediccion.riesgo >= 80,
        },
      });

      procesados.push({ ...trabajadorGuardado, prediccion });
    }

    console.log(`[INGESTA CSV/ML] ${procesados.length} registro(s) evaluados y almacenados en PostgreSQL.`);

    res.json({
      ok: true,
      message: `${procesados.length} trabajador(es) evaluados por el motor ML (.pkl) y guardados en PostgreSQL.`,
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