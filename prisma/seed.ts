import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpiando registros previos...');
  await prisma.historialReasignacion.deleteMany();
  await prisma.turno.deleteMany();
  await prisma.trabajador.deleteMany();

  console.log('Insertando trabajadores y turnos iniciales en PostgreSQL...');

  const trabajadoresData = [
    {
      id: 'w-1',
      rut: '17.894.231-1',
      nombre: 'Juana',
      apellido: 'Pérez G.',
      cargo: 'Operaria de Cuadrilla',
      riesgo: 14,
      nivel_riesgo: 'NORMAL',
      estado_disponibilidad: 'DISPONIBLE',
      ultimo_descanso_horas: 18,
      turno: {
        tipo_turno: 'Noche',
        horas_acumuladas_semana: 54,
        noches_consecutivas: 4,
        descansos_compensatorios: 2,
      },
    },
    {
      id: 'w-2',
      rut: '18.231.543-K',
      nombre: 'Carlos',
      apellido: 'Muñoz R.',
      cargo: 'Operador de Grúa Horquilla',
      riesgo: 22,
      nivel_riesgo: 'NORMAL',
      estado_disponibilidad: 'DISPONIBLE',
      ultimo_descanso_horas: 16,
      turno: {
        tipo_turno: 'Noche',
        horas_acumuladas_semana: 48,
        noches_consecutivas: 3,
        descansos_compensatorios: 2,
      },
    },
    {
      id: 'w-3',
      rut: '19.452.129-8',
      nombre: 'Pedro',
      apellido: 'Soto L.',
      cargo: 'Conductor de Ruta',
      riesgo: 68,
      nivel_riesgo: 'ALERTA',
      estado_disponibilidad: 'DISPONIBLE',
      ultimo_descanso_horas: 24,
      turno: {
        tipo_turno: 'Día',
        horas_acumuladas_semana: 32,
        noches_consecutivas: 0,
        descansos_compensatorios: 1,
      },
    },
    {
      id: 'w-4',
      rut: '16.782.901-3',
      nombre: 'Rodrigo',
      apellido: 'Vega M.',
      cargo: 'Conductor Troncal',
      riesgo: 92,
      nivel_riesgo: 'CRÍTICO',
      estado_disponibilidad: 'EN_TURNO',
      ultimo_descanso_horas: 9,
      turno: {
        tipo_turno: 'Noche',
        horas_acumuladas_semana: 52,
        noches_consecutivas: 3,
        descansos_compensatorios: 0,
      },
    },
  ];

  for (const item of trabajadoresData) {
    await prisma.trabajador.create({
      data: {
        id: item.id,
        rut: item.rut,
        nombre: item.nombre,
        apellido: item.apellido,
        cargo: item.cargo,
        riesgo: item.riesgo,
        nivel_riesgo: item.nivel_riesgo,
        estado_disponibilidad: item.estado_disponibilidad,
        ultimo_descanso_horas: item.ultimo_descanso_horas,
        turnos: {
          create: {
            tipo_turno: item.turno.tipo_turno,
            fecha_inicio: new Date(),
            fecha_fin: new Date(Date.now() + 8 * 60 * 60 * 1000),
            horas_acumuladas_semana: item.turno.horas_acumuladas_semana,
            noches_consecutivas: item.turno.noches_consecutivas,
            descansos_compensatorios: item.turno.descansos_compensatorios,
            estado_turno: 'ACTIVO',
          },
        },
      },
    });
  }

await prisma.historialReasignacion.create({
  data: {
    fecha: '2026-09-27 14:30',
    trabajadorId: 'w-0',
    trabajadorOrigen: 'Héctor Tapia S.',
    rutOrigen: '15.902.431-7',
    trabajadorReemplazo: 'Juana Pérez G.',
    accion: 'Bloqueado Preventivo (Descanso 24h)',
    motivo: 'Exceso de 48h acumuladas en turno rotativo. Descanso obligatorio.',
    supervisor: 'Supervisor de Turno',
  },
});

console.log('¡Base de datos poblada con éxito!');
}

main()
  .catch((e) => {
    console.error('Error al poblar la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });