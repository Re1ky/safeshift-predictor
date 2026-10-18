import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpiando registros previos en PostgreSQL...');
  await prisma.historialReasignacion.deleteMany();
  await prisma.prediccionFatiga.deleteMany();
  await prisma.turno.deleteMany();
  await prisma.trabajador.deleteMany();
  await prisma.usuario.deleteMany();

  console.log('1. Creando cuentas de Usuario (Autenticación RBAC)...');
  await prisma.usuario.createMany({
    data: [
      {
        rut: '21.703.347-0',
        nombre: 'Ignacio Cuevas',
        rol: 'Supervisor de Turno',
        email: 'supervisor@safeshift.cl',
        password_hash: 'safeshift2026',
      },
      {
        rut: '21.683.327-9',
        nombre: 'Benjamín Berrios',
        rol: 'Analista RRHH / Prevencionista',
        email: 'rrhh@safeshift.cl',
        password_hash: 'safeshift2026',
      },
      {
        rut: '21.369.093-0',
        nombre: 'Javiera Vargas',
        rol: 'Analista RRHH / Prevencionista',
        email: 'ml.qa@safeshift.cl',
        password_hash: 'safeshift2026',
      },
      {
        rut: '20.247.894-8',
        nombre: 'Matías Carrasco',
        rol: 'Supervisor de Turno',
        email: 'operaciones@safeshift.cl',
        password_hash: 'safeshift2026',
      },
    ],
  });

  console.log('2. Insertando flota de 24 trabajadores, turnos y predicciones ML...');

  const trabajadoresData = [
    // 4 OPERARIOS EN RIESGO CRÍTICO (>= 80%)
    { id: 'w-1', rut: '16.782.901-3', nombre: 'Rodrigo', apellido: 'Vega M.', cargo: 'Conductor Troncal Ruta 5', riesgo: 92, nivel_riesgo: 'CRÍTICO', estado: 'EN_TURNO', descanso: 8, tipo_turno: 'Noche', horas: 56, noches: 4, comp: 0 },
    { id: 'w-2', rut: '15.432.198-K', nombre: 'Mauricio', apellido: 'Bravo C.', cargo: 'Conductor Rampa Pesada', riesgo: 88, nivel_riesgo: 'CRÍTICO', estado: 'EN_TURNO', descanso: 7, tipo_turno: 'Noche', horas: 54, noches: 4, comp: 0 },
    { id: 'w-3', rut: '17.109.832-4', nombre: 'Esteban', apellido: 'Morales P.', cargo: 'Operador Grúa Horquilla', riesgo: 85, nivel_riesgo: 'CRÍTICO', estado: 'EN_TURNO', descanso: 9, tipo_turno: 'Noche', horas: 52, noches: 3, comp: 0 },
    { id: 'w-4', rut: '14.892.301-7', nombre: 'Cristián', apellido: 'Riquelme A.', cargo: 'Conductor Frigorífico', riesgo: 81, nivel_riesgo: 'CRÍTICO', estado: 'EN_TURNO', descanso: 9, tipo_turno: 'Mixto', horas: 51, noches: 3, comp: 1 },

    // 5 OPERARIOS EN ALERTA PREVENTIVA (50% - 79%)
    { id: 'w-5', rut: '19.452.129-8', nombre: 'Pedro', apellido: 'Soto L.', cargo: 'Conductor de Ruta', riesgo: 68, nivel_riesgo: 'ALERTA', estado: 'DISPONIBLE', descanso: 11, tipo_turno: 'Mixto', horas: 48, noches: 2, comp: 1 },
    { id: 'w-6', rut: '18.765.412-2', nombre: 'Fabián', apellido: 'Cisternas V.', cargo: 'Operario de Despacho', riesgo: 74, nivel_riesgo: 'ALERTA', estado: 'EN_TURNO', descanso: 10, tipo_turno: 'Noche', horas: 49, noches: 2, comp: 1 },
    { id: 'w-7', rut: '16.124.908-5', nombre: 'Claudia', apellido: 'Navarro T.', cargo: 'Conductora Distribución', riesgo: 64, nivel_riesgo: 'ALERTA', estado: 'DISPONIBLE', descanso: 12, tipo_turno: 'Mixto', horas: 47, noches: 2, comp: 1 },
    { id: 'w-8', rut: '17.543.876-1', nombre: 'Gonzalo', apellido: 'Fuentes R.', cargo: 'Operador Apilador Eléctrico', riesgo: 59, nivel_riesgo: 'ALERTA', estado: 'DISPONIBLE', descanso: 12, tipo_turno: 'Noche', horas: 46, noches: 2, comp: 1 },
    { id: 'w-9', rut: '18.901.234-6', nombre: 'Valeria', apellido: 'Salazar M.', cargo: 'Supervisora de Patio', riesgo: 53, nivel_riesgo: 'ALERTA', estado: 'DISPONIBLE', descanso: 13, tipo_turno: 'Día', horas: 46, noches: 1, comp: 1 },

    // 15 OPERARIOS EN ESTADO NORMAL (< 50%) — Candidatos Sustitutos Seguros
    { id: 'w-10', rut: '17.894.231-1', nombre: 'Juana', apellido: 'Pérez G.', cargo: 'Operaria de Cuadrilla', riesgo: 14, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 20, tipo_turno: 'Día', horas: 38, noches: 0, comp: 2 },
    { id: 'w-11', rut: '18.231.543-K', nombre: 'Carlos', apellido: 'Muñoz R.', cargo: 'Operador Grúa Horquilla', riesgo: 22, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 18, tipo_turno: 'Día', horas: 40, noches: 1, comp: 2 },
    { id: 'w-12', rut: '19.112.334-9', nombre: 'Sebastián', apellido: 'Contreras D.', cargo: 'Conductor Troncal Ruta 5', riesgo: 18, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 24, tipo_turno: 'Día', horas: 36, noches: 0, comp: 3 },
    { id: 'w-13', rut: '20.431.987-2', nombre: 'Camila', apellido: 'Orellana S.', cargo: 'Operaria Recepción Carga', riesgo: 12, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 22, tipo_turno: 'Día', horas: 35, noches: 0, comp: 2 },
    { id: 'w-14', rut: '16.998.123-4', nombre: 'Hernán', apellido: 'Valdés B.', cargo: 'Conductor de Ruta', riesgo: 29, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 16, tipo_turno: 'Mixto', horas: 42, noches: 1, comp: 2 },
    { id: 'w-15', rut: '18.554.321-0', nombre: 'Daniela', apellido: 'Pizarro L.', cargo: 'Operadora Control Stock', riesgo: 16, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 19, tipo_turno: 'Día', horas: 39, noches: 0, comp: 2 },
    { id: 'w-16', rut: '15.776.890-3', nombre: 'Patricio', apellido: 'Garrido M.', cargo: 'Conductor Rampa Pesada', riesgo: 34, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 15, tipo_turno: 'Mixto', horas: 43, noches: 1, comp: 2 },
    { id: 'w-17', rut: '19.887.654-1', nombre: 'Nicolás', apellido: 'Aravena C.', cargo: 'Operador Grúa Horquilla', riesgo: 25, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 17, tipo_turno: 'Día', horas: 41, noches: 0, comp: 2 },
    { id: 'w-18', rut: '20.123.789-5', nombre: 'Fernanda', apellido: 'Bustos E.', cargo: 'Conductora Distribución', riesgo: 19, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 21, tipo_turno: 'Día', horas: 37, noches: 0, comp: 2 },
    { id: 'w-19', rut: '17.445.667-8', nombre: 'Alejandro', apellido: 'Molina V.', cargo: 'Operario de Cuadrilla', riesgo: 31, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 16, tipo_turno: 'Mixto', horas: 42, noches: 1, comp: 2 },
    { id: 'w-20', rut: '18.332.119-7', nombre: 'Lorena', apellido: 'Sepúlveda H.', cargo: 'Operaria Logística', riesgo: 15, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 20, tipo_turno: 'Día', horas: 38, noches: 0, comp: 2 },
    { id: 'w-21', rut: '16.554.998-2', nombre: 'Marcelo', apellido: 'Cárdenas J.', cargo: 'Conductor Frigorífico', riesgo: 38, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 14, tipo_turno: 'Mixto', horas: 44, noches: 1, comp: 1 },
    { id: 'w-22', rut: '19.321.654-K', nombre: 'Paula', apellido: 'Espinoza N.', cargo: 'Operaria Despacho', riesgo: 21, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 18, tipo_turno: 'Día', horas: 40, noches: 0, comp: 2 },
    { id: 'w-23', rut: '15.887.432-6', nombre: 'Ricardo', apellido: 'Paredes Q.', cargo: 'Conductor Troncal Ruta 5', riesgo: 27, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 16, tipo_turno: 'Día', horas: 41, noches: 1, comp: 2 },
    { id: 'w-24', rut: '20.654.321-8', nombre: 'Tomás', apellido: 'Henríquez Z.', cargo: 'Operador Apilador Eléctrico', riesgo: 11, nivel_riesgo: 'NORMAL', estado: 'DISPONIBLE', descanso: 24, tipo_turno: 'Día', horas: 35, noches: 0, comp: 3 },
  ];

  for (const item of trabajadoresData) {
    const pesoHoras = Math.round((item.horas / 60) * 45);
    const pesoNoches = Math.round((item.noches / 5) * 35);
    const pesoDescanso = Math.max(5, Math.round(((24 - Math.min(24, item.descanso)) / 24) * 20));

    await prisma.trabajador.create({
      data: {
        id: item.id,
        rut: item.rut,
        nombre: item.nombre,
        apellido: item.apellido,
        cargo: item.cargo,
        riesgo: item.riesgo,
        nivel_riesgo: item.nivel_riesgo,
        estado_disponibilidad: item.estado,
        ultimo_descanso_horas: item.descanso,
        turnos: {
          create: {
            tipo_turno: item.tipo_turno,
            fecha_inicio: new Date(),
            fecha_fin: new Date(Date.now() + 8 * 60 * 60 * 1000),
            horas_acumuladas_semana: item.horas,
            noches_consecutivas: item.noches,
            descansos_compensatorios: item.comp,
            estado_turno: 'ACTIVO',
          },
        },
        predicciones: {
          create: {
            score_probabilidad: Number((item.riesgo / 100).toFixed(2)),
            nivel_riesgo: item.nivel_riesgo,
            factores_determinantes: JSON.stringify({
              impacto_horas_semanales: `${pesoHoras}%`,
              impacto_noches_consecutivas: `${pesoNoches}%`,
              impacto_deficit_descanso: `${pesoDescanso}%`,
              modelo: 'RandomForestClassifier (motor_predictivo_safeshift.pkl)',
            }),
            requiere_bloqueo: item.riesgo >= 80,
          },
        },
      },
    });
  }

  console.log('3. Insertando registros de auditoría en HistorialReasignacion...');
  await prisma.historialReasignacion.createMany({
    data: [
      {
        fecha: '2026-10-16 22:15',
        trabajadorId: 'w-0',
        trabajadorOrigen: 'Héctor Tapia S.',
        rutOrigen: '15.902.431-7',
        trabajadorReemplazo: 'Juana Pérez G.',
        accion: 'Bloqueado Preventivo (Descanso 24h)',
        motivo: 'Exceso de 54h acumuladas y 4 turnos nocturnos rotativos. Descanso obligatorio Art. 38.',
        supervisor: 'Ignacio Cuevas (Supervisor de Turno)',
      },
      {
        fecha: '2026-10-17 08:40',
        trabajadorId: 'w-0b',
        trabajadorOrigen: 'Marco Antonio Silva',
        rutOrigen: '14.512.890-2',
        trabajadorReemplazo: 'Sebastián Contreras D.',
        accion: 'Permiso Compensatorio (Descanso 48h)',
        motivo: 'Alerta predictiva ML 89%: ventana de descanso inferior a 9 horas en ruta troncal.',
        supervisor: 'Matías Carrasco (Supervisor de Turno)',
      },
      {
        fecha: '2026-10-18 06:20',
        trabajadorId: 'w-0c',
        trabajadorOrigen: 'Roberto Gómez L.',
        rutOrigen: '16.210.443-9',
        trabajadorReemplazo: 'Camila Orellana S.',
        accion: 'Cambio a Turno Diurno Liviano',
        motivo: 'Mitigación preventiva de fatiga circadiana tras 3 noches consecutivas en planta.',
        supervisor: 'Ignacio Cuevas (Supervisor de Turno)',
      },
    ],
  });

  console.log('¡Base de datos poblada con éxito (4 Usuarios, 24 Trabajadores, 24 Turnos, 24 Predicciones ML y 3 Historiales)!');
}

main()
  .catch((e) => {
    console.error('Error al poblar la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });