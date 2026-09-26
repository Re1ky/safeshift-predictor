import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Permite que tu API entienda información en formato JSON
app.use(express.json());

// Endpoint de prueba para verificar que la API está viva
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor SafeShift Predictor funcionando' });
});

// Endpoint vacío donde programarás la consulta de trabajadores
app.get('/api/trabajadores', async (req, res) => {
  // Aquí usaremos Prisma para consultar la base de datos más adelante
  res.json({ message: 'Lista de trabajadores próximamente' });
});

// Endpoint vacío exigido por el profesor para reasignar turnos
app.post('/api/reasignar', async (req, res) => {
  // Aquí programarás el bloqueo preventivo y reasignación de tareas
  res.json({ message: 'Acción de reasignación recibida' });
});

app.listen(PORT, () => {
  console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
});