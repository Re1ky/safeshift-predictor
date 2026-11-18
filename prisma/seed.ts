import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function calcularPesosCajaBlanca(
  horasSemanales: number,
  nochesConsecutivas: number,
  horasDescanso: number,
  nivel: string,
) {
  const brutaHoras = Math.max(5, (horasSemanales - 30) * 1.8);
  const brutaNoches = Math.max(2, nochesConsecutivas * 14);
  const brutaDescanso = Math.max(5, (24 - Math.min(24, horasDescanso)) * 2.2);
  const suma = brutaHoras + brutaNoches + brutaDescanso || 1;

  const peso_horas = Math.round((brutaHoras / suma) * 100);
  const peso_noches = Math.round((brutaNoches / suma) * 100);
  const peso_descanso = Math.max(0, 100 - peso_horas - peso_noches);

  let factor_critico = 'Parámetros dentro de rango operativo normal';
  if (nivel === 'CRÍTICO') {
    factor_critico = `Combinación crítica: ${nochesConsecutivas} noches seguidas + ${horasSemanales}h semanales (Descanso ${horasDescanso}h)`;
  } else if (nivel === 'ALERTA') {
    factor_critico = `Acumulación moderada de fatiga (${horasSemanales}h semanales / ${nochesConsecutivas} noches)`;
  }

  return { peso_horas, peso_noches, peso_descanso, factor_critico };
}

async function main() {
  console.log('Limpiando registros previos en PostgreSQL...');
  await prisma.historialReasignacion.deleteMany();
  await prisma.prediccionFatiga.deleteMany();
  await prisma.turno.deleteMany();
  await prisma.trabajador.deleteMany();
  await prisma.usuario.deleteMany();

  console.log('1. Creando cuentas de Usuario (Autenticación RBAC)...');
  const userIgnacio = await prisma.usuario.create({
    data: {
      rut: '21.703.347-0',
      nombre: 'Ignacio Cuevas',
      rol: 'Supervisor de Turno',
      email: 'supervisor@safeshift.cl',
      password_hash: 'safeshift2026',
    },
  });

  await prisma.usuario.create({
    data: {
      rut: '21.683.327-9',
      nombre: 'Benjamín Berríos',
      rol: 'Analista RRHH',
      email: 'rrhh@safeshift.cl',
      password_hash: 'safeshift2026',
    },
  });

  await prisma.usuario.create({
    data: {
      rut: '21.369.093-0',
      nombre: 'Javiera Vargas',
      rol: 'Prevencionista',
      email: 'prevencion@safeshift.cl',
      password_hash: 'safeshift2026',
    },
  });

  const userMatias = await prisma.usuario.create({
    data: {
      rut: '20.247.894-8',
      nombre: 'Matías Carrasco',
      rol: 'Supervisor de Turno',
      email: 'admin@safeshift.cl',
      password_hash: 'safeshift2026',
    },
  });

  console.log('2. Insertando flota de 24 trabajadores, turnos y predicciones ML (3FN)...');

  const flota = [
    // 4 CRÍTICOS (Turno Noche | Promedio 53.3h semanales)
    { id: 'w-1', rut: '16.782.901-3', nombre: 'Rodrigo', apellido: 'Vega M.', cargo: 'Conductor Troncal', turno: 'Noche', horas: 52, noches: 3, descanso: 9, riesgo: 92, nivel: 'CRÍTICO', estado: 'EN_TURNO' },
    { id: 'w-2', rut: '15.902.431-7', nombre: 'Héctor', apellido: 'Tapia S.', cargo: 'Conductor Distribución', turno: 'Noche', horas: 54, noches: 4, descanso: 8, riesgo: 89, nivel: 'CRÍTICO', estado: 'EN_TURNO' },
    { id: 'w-3', rut: '14.512.890-2', nombre: 'Marco Antonio', apellido: 'Silva', cargo: 'Conductor Ruta Troncal', turno: 'Noche', horas: 55, noches: 4, descanso: 8, riesgo: 87, nivel: 'CRÍTICO', estado: 'EN_TURNO' },
    { id: 'w-4', rut: '16.210.443-9', nombre: 'Roberto', apellido: 'Gómez L.', cargo: 'Operador Planta Nocturna', turno: 'Noche', horas: 52, noches: 3, descanso: 9, riesgo: 85, nivel: 'CRÍTICO', estado: 'EN_TURNO' },

    // 5 ALERTAS (1 Noche, 1 Día, 3 Mixto)
    { id: 'w-5', rut: '17.445.120-4', nombre: 'Esteban', apellido: 'Morales P.', cargo: 'Operador Grúa Horquilla', turno: 'Noche', horas: 48, noches: 2, descanso: 11, riesgo: 72, nivel: 'ALERTA', estado: 'EN_TURNO' },
    { id: 'w-6', rut: '19.452.129-8', nombre: 'Pedro', apellido: 'Soto L.', cargo: 'Conductor de Ruta', turno: 'Día', horas: 48, noches: 1, descanso: 12, riesgo: 68, nivel: 'ALERTA', estado: 'EN_TURNO' },
    { id: 'w-7', rut: '17.221.344-K', nombre: 'Marcela', apellido: 'Rojas S.', cargo: 'Inspectora Logística', turno: 'Mixto', horas: 47, noches: 2, descanso: 12, riesgo: 66, nivel: 'ALERTA', estado: 'EN_TURNO' },
    { id: 'w-8', rut: '19.112.443-9', nombre: 'Daniela', apellido: 'Pérez R.', cargo: 'Logística Inversa', turno: 'Mixto', horas: 46, noches: 2, descanso: 12, riesgo: 63, nivel: 'ALERTA', estado: 'EN_TURNO' },
    { id: 'w-9', rut: '15.667.221-4', nombre: 'Felipe', apellido: 'Riquelme M.', cargo: 'Despachador de Carga', turno: 'Mixto', horas: 46, noches: 1, descanso: 13, riesgo: 58, nivel: 'ALERTA', estado: 'EN_TURNO' },

    // 15 NORMALES DISPONIBLES (11 Día, 4 Mixto -> Total: 5 Noche, 12 Día, 7 Mixto)
    { id: 'w-10', rut: '18.231.543-K', nombre: 'Carlos', apellido: 'Muñoz R.', cargo: 'Operador de Grúa Horquilla', turno: 'Día', horas: 40, noches: 0, descanso: 16, riesgo: 22, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-11', rut: '17.894.231-1', nombre: 'Juana', apellido: 'Pérez G.', cargo: 'Operaria de Cuadrilla', turno: 'Día', horas: 38, noches: 0, descanso: 18, riesgo: 14, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-12', rut: '18.654.321-5', nombre: 'Camila', apellido: 'Orellana S.', cargo: 'Operaria de Planta', turno: 'Día', horas: 40, noches: 0, descanso: 18, riesgo: 18, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-13', rut: '19.321.765-2', nombre: 'Sebastián', apellido: 'Contreras D.', cargo: 'Conductor de Reemplazo', turno: 'Día', horas: 39, noches: 0, descanso: 17, riesgo: 19, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-14', rut: '16.890.123-7', nombre: 'Anaís', apellido: 'Fuentes G.', cargo: 'Operaria de Bodega', turno: 'Día', horas: 41, noches: 0, descanso: 16, riesgo: 24, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-15', rut: '18.112.908-1', nombre: 'Cristian', apellido: 'Valdés M.', cargo: 'Conductor Ruta 5', turno: 'Día', horas: 38, noches: 0, descanso: 19, riesgo: 16, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-16', rut: '17.543.876-3', nombre: 'Valentina', apellido: 'Castro P.', cargo: 'Coordinadora de Andén', turno: 'Día', horas: 40, noches: 0, descanso: 18, riesgo: 20, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-17', rut: '19.678.234-6', nombre: 'Matías', apellido: 'Navarro L.', cargo: 'Operario Logístico', turno: 'Día', horas: 36, noches: 0, descanso: 20, riesgo: 12, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-18', rut: '16.432.890-8', nombre: 'Javiera', apellido: 'Araya T.', cargo: 'Control de Inventario', turno: 'Día', horas: 42, noches: 0, descanso: 16, riesgo: 26, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-19', rut: '18.901.345-0', nombre: 'Diego', apellido: 'Espinoza R.', cargo: 'Conductor Urbano', turno: 'Día', horas: 39, noches: 0, descanso: 18, riesgo: 17, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-20', rut: '17.345.678-9', nombre: 'Sofía', apellido: 'Mendoza V.', cargo: 'Operaria de Picking', turno: 'Día', horas: 37, noches: 0, descanso: 19, riesgo: 15, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-21', rut: '19.234.567-4', nombre: 'Tomás', apellido: 'Herrera C.', cargo: 'Operador Apilador', turno: 'Mixto', horas: 42, noches: 1, descanso: 15, riesgo: 31, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-22', rut: '16.567.890-2', nombre: 'Constanza', apellido: 'Bravo F.', cargo: 'Asistente de Despacho', turno: 'Mixto', horas: 41, noches: 0, descanso: 16, riesgo: 25, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-23', rut: '18.789.012-K', nombre: 'Bastián', apellido: 'Lagos S.', cargo: 'Conductor de Apoyo', turno: 'Mixto', horas: 40, noches: 1, descanso: 16, riesgo: 28, nivel: 'NORMAL', estado: 'DISPONIBLE' },
    { id: 'w-24', rut: '17.901.234-5', nombre: 'Francisca', apellido: 'Pizarro N.', cargo: 'Operaria de Recepción', turno: 'Mixto', horas: 38, noches: 0, descanso: 18, riesgo: 19, nivel: 'NORMAL', estado: 'DISPONIBLE' },
  ];

  for (const item of flota) {
    const cajaBlanca = calcularPesosCajaBlanca(
      item.horas,
      item.noches,
      item.descanso,
      item.nivel,
    );

    await prisma.trabajador.create({
      data: {
        id: item.id,
        rut: item.rut,
        nombre: item.nombre,
        apellido: item.apellido,
        cargo: item.cargo,
        estado_disponibilidad: item.estado,
        ultimo_descanso_horas: item.descanso,
        turnos: {
          create: {
            tipo_turno: item.turno,
            fecha_inicio: new Date(),
            fecha_fin: new Date(Date.now() + 8 * 60 * 60 * 1000),
            horas_acumuladas_semana: item.horas,
            descansos_compensatorios: item.descanso >= 16 ? 2 : 0,
            noches_consecutivas: item.noches,
            estado_turno: 'ACTIVO',
          },
        },
        predicciones: {
          create: {
            riesgo_porcentaje: item.riesgo,
            nivel_riesgo: item.nivel,
            peso_horas: cajaBlanca.peso_horas,
            peso_noches: cajaBlanca.peso_noches,
            peso_descanso: cajaBlanca.peso_descanso,
            factor_critico: cajaBlanca.factor_critico,
          },
        },
      },
    });
  }

  console.log('3. Insertando 3 registros de auditoría en HistorialReasignacion (FK 3FN)...');
  await prisma.historialReasignacion.createMany({
    data: [
      {
        fecha: '2026-10-16 22:15',
        trabajadorOrigenId: 'w-2', // Héctor Tapia S.
        trabajadorReemplazoId: 'w-11', // Juana Pérez G.
        usuarioId: userIgnacio.id,
        accion: 'Bloqueado Preventivo (Descanso 24h)',
        motivo: 'Exceso de 54h acumuladas y 4 turnos nocturnos rotativos. Descanso obligatorio Art. 38.',
      },
      {
        fecha: '2026-10-17 08:40',
        trabajadorOrigenId: 'w-3', // Marco Antonio Silva
        trabajadorReemplazoId: 'w-13', // Sebastián Contreras D.
        usuarioId: userMatias.id,
        accion: 'Permiso Compensatorio (Descanso 48h)',
        motivo: 'Alerta predictiva ML 89%: ventana de descanso inferior a 9 horas en ruta troncal.',
      },
      {
        fecha: '2026-10-18 06:20',
        trabajadorOrigenId: 'w-4', // Roberto Gómez L.
        trabajadorReemplazoId: 'w-12', // Camila Orellana S.
        usuarioId: userIgnacio.id,
        accion: 'Cambio a Turno Diurno Liviano',
        motivo: 'Mitigación preventiva de fatiga circadiana tras 3 noches consecutivas en planta.',
      },
    ],
  });

  console.log(
    '¡Base de datos 3FN poblada con éxito (4 Usuarios, 24 Trabajadores, 24 Turnos, 24 Predicciones ML y 3 Historiales)!',
  );
}

main()
  .catch((e) => {
    console.error('Error al poblar la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });