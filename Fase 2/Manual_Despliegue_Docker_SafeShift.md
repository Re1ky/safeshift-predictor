# Manual Técnico de Configuración de Ambientes y Despliegue con Docker — SafeShift Predictor

**Proyecto:** SafeShift Predictor — Sistema Predictivo de Fatiga y Prevención de Riesgos Laborales  
**Responsable Técnico:** Ignacio Cuevas (Ingeniero Backend, Arquitectura de Datos y DevOps)  
**Asignatura:** Proyecto Capstone (PTY4614) — Duoc UC  
**Competencia Evaluada:** C4 — Administrar la configuración de ambientes, servicios de aplicaciones y bases de datos en un entorno empresarial simulado, utilizando contenedores para sistematizar la implantación.

---

## 1. Propósito y Alcance del Documento

Este manual técnico establece el procedimiento estandarizado para configurar, construir, desplegar y verificar la infraestructura de software del sistema **SafeShift Predictor**. El documento abarca tanto la implantación contenerizada mediante **Docker y Docker Compose** como la ejecución híbrida sobre motores **PostgreSQL** nativos en entornos de laboratorio académico.

El diseño de infraestructura cumple con el Requisito No Funcional de Portabilidad (**RNF-03 / RNF-04**), garantizando que la base de datos relacional normalizada en Tercera Forma Normal (**3FN**), el servidor transaccional Node.js junto al motor de Machine Learning en Python y la interfaz web en React puedan levantarse de manera reproducible en menos de cinco minutos sobre cualquier sistema operativo anfitrión.

---

## 2. Arquitectura de Contenedores y Servicios Orquestados

La solución implementa una arquitectura desacoplada de tres capas (**N-Tier**) definida en el archivo de orquestación principal:

| Servicio | Contenedor | Imagen Base | Puerto | Capa del Sistema |
| :--- | :--- | :--- | :--- | :--- |
| **db** | `safeshift_postgres` | `postgres:15-alpine` | `5432` | Persistencia Relacional (5 Tablas en 3FN) |
| **backend** | `safeshift_backend` | `node:22-bookworm-slim` + `Python 3` | `4000` | API REST Transaccional y Motor ML (`.pkl`) |
| **frontend** | `safeshift_frontend` | `node:22-alpine` | `3000` | Interfaz Web SPA (React 19 + Tailwind) |

### Detalle funcional de cada contenedor en la red interna del proyecto:

* **Servicio de Base de Datos (`db`):** Ejecuta PostgreSQL 15 con almacenamiento persistente mediante el volumen local `postgres_data`. Aloja la base de datos `safeshift_db` normalizada en **Tercera Forma Normal (3FN)** e integrada por 5 tablas relacionales (`Usuario`, `Trabajador`, `Turno`, `PrediccionFatiga` e `HistorialReasignacion`), utilizando claves foráneas estrictas (`trabajadorOrigenId`, `trabajadorReemplazoId` y `usuarioId`) para eliminar redundancias de texto y columnas atómicas (`peso_horas`, `peso_noches`, `peso_descanso`, `factor_critico`) para la explicabilidad del modelo ML. Incluye una sonda de salud (`healthcheck`) que valida la disponibilidad del motor antes de iniciar la capa de negocio.
* **Servicio de Negocio e Inferencia (`backend`):** Combina el entorno de ejecución de Node.js con un entorno de Python 3 provisto de las librerías científicas `scikit-learn`, `pandas`, `numpy` y `joblib`. Ejecuta la sincronización declarativa de Prisma ORM sobre el esquema 3FN, aplica transacciones atómicas (`prisma.$transaction`) de reasignación con control de concurrencia estricto (**RNF-02**, `HTTP 409 Conflict`) e invoca el modelo `motor_predictivo_safeshift.pkl` vía `src/ml/predecir_turno.py` para la evaluación de fatiga con explicabilidad de Caja Blanca.
* **Servicio de Presentación (`frontend`):** Sirve la aplicación web construida con React 19, TypeScript, Vite y Tailwind CSS en el puerto `3000`, conectándose con la capa de negocio en el puerto `4000` mediante peticiones HTTP JSON para los perfiles de **Supervisor de Turno** y **Analista RRHH / Prevencionista**.

---

## 3. Configuración de Variables de Entorno (`.env`)

Por cumplimiento de las políticas de seguridad y protección de credenciales (**RNF-01** y **Ley N° 19.628**), el archivo `.env` se excluye del control de versiones mediante `.gitignore`. Previo al despliegue, se debe generar el archivo `.env` en la raíz del proyecto a partir de la plantilla `.env.example` con los siguientes parámetros:

| Variable | Valor Estandarizado | Rol en la Configuración |
| :--- | :--- | :--- |
| `POSTGRES_USER` | `postgres` | Usuario administrador de PostgreSQL |
| `POSTGRES_PASSWORD` | `safeshift` | Contraseña de acceso al motor relacional |
| `POSTGRES_DB` | `safeshift_db` | Nombre de la base de datos del proyecto |
| `DATABASE_URL` | `postgresql://postgres:safeshift@localhost:5432/safeshift_db?schema=public` | Cadena de conexión para Prisma ORM |
| `PORT` | `4000` | Puerto de escucha del servidor Backend API REST |

Contenido exacto del archivo `.env` en la raíz del repositorio:

~~~env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=safeshift
POSTGRES_DB=safeshift_db
DATABASE_URL="postgresql://postgres:safeshift@localhost:5432/safeshift_db?schema=public"
PORT=4000
~~~

---

## 4. Especificación de Archivos de Contenerización

### 4.1. Contenedor Híbrido de Backend y Machine Learning (`Dockerfile` en la raíz)

~~~dockerfile
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    openssl \
    && pip3 install --break-system-packages joblib pandas scikit-learn numpy \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && node --experimental-strip-types prisma/seed.ts && node --experimental-strip-types src/index.ts"]
~~~

### 4.2. Contenedor de Interfaz Web (`frontend/Dockerfile`)

~~~dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
~~~

### 4.3. Orquestación Multi-Contenedor (`docker-compose.yml` en la raíz)

~~~yaml
services:
  db:
    image: postgres:15-alpine
    container_name: safeshift_postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-safeshift}
      POSTGRES_DB: ${POSTGRES_DB:-safeshift_db}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d safeshift_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: safeshift_backend
    restart: on-failure
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: "postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-safeshift}@db:5432/${POSTGRES_DB:-safeshift_db}?schema=public"
      PORT: 4000
    ports:
      - "4000:4000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: safeshift_frontend
    restart: on-failure
    depends_on:
      - backend
    ports:
      - "3000:3000"

volumes:
  postgres_data:
~~~

---

## 5. Procedimiento de Despliegue Modalidad A: Orquestación Completa con Docker Compose

1. **Clonar el repositorio y generar el archivo de entorno:**
~~~powershell
git clone https://github.com/Re1ky/safeshift-predictor.git
cd safeshift-predictor
Copy-Item .env.example .env
~~~

2. **Construir las imágenes e iniciar los contenedores en segundo plano:**
~~~powershell
docker compose up --build -d
~~~

3. **Comprobar el estado de salud de los contenedores en ejecución:**
~~~powershell
docker compose ps
~~~

4. **Inspección de bitácora del servidor transaccional:**
~~~powershell
docker compose logs -f backend
~~~

---

## 6. Procedimiento de Despliegue Modalidad B: Ejecución Híbrida para Desarrollo y Auditoría en Vivo

### Paso 1: Sincronización de Esquema Relacional (3FN), Poblado Inicial y Backend (Terminal 1)

~~~powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
pip install joblib pandas scikit-learn numpy
npm install
npx prisma generate
npx prisma db push
node --experimental-strip-types prisma/seed.ts
node --experimental-strip-types src/index.ts
~~~

### Paso 2: Compilación y Ejecución del Dashboard Frontend (Terminal 2)

~~~powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
cd frontend
npm install --legacy-peer-deps
npm run dev
~~~

### Paso 3: Consola de Administración Visual Prisma Studio (Terminal 3)

~~~powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npx prisma studio
~~~

---

## 7. Verificación de Servicios y Pruebas Post-Despliegue (Smoke Tests)

### 7.1. Comprobación de Salud de la API y Persistencia 3FN en PostgreSQL
~~~powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/health" -Method Get
~~~
* **Resultado esperado:** Respuesta JSON con `"ok": true`, `"estadoBD": "Conectado a PostgreSQL (safeshift_db) — Normalizado 3FN"` y `"operariosRegistrados": 24`.

### 7.2. Verificación de Transacción ACID y Control de Concurrencia Estricta (Cumplimiento RNF-02)
~~~powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/reassign" -Method Post -ContentType "application/json" -Body '{"workerId":"w-1","accionPreventiva":"Bloqueado Preventivo (Descanso 24h)","substituteId":"w-10","motivo":"Prueba 3FN Art. 38"}'
~~~
* **Resultado esperado:** La primera petición ejecuta la transacción ACID en las tablas normalizadas (`HTTP 200 OK` con `"Reasignación guardada transaccionalmente en PostgreSQL (3FN)"`). Al enviar una segunda petición consecutiva sobre el mismo operario (`w-1`), el servidor rechaza inmediatamente la operación con código **`HTTP 409 Conflict`** e imprime la alerta `[BLOQUEO CONCURRENCIA RNF02]` en la consola del backend.

### 7.3. Verificación de Inferencia del Motor de Machine Learning y Explicabilidad de Caja Blanca
~~~powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/predict" -Method Post -ContentType "application/json" -Body '{"horasSemanales":56,"nochesConsecutivas":4,"ultimoDescansoHoras":8,"workerId":"w-1"}'
~~~
* **Resultado esperado:** El backend invoca `src/ml/predecir_turno.py`, evalúa los parámetros en `motor_predictivo_safeshift.pkl`, retorna `"riesgo": 85` y `"nivel": "CRÍTICO"` junto al desglose de Caja Blanca e inserta el registro atómico (`riesgo_porcentaje`, `nivel_riesgo`, `peso_horas`, `peso_noches`, `peso_descanso` y `factor_critico`) en la tabla `PrediccionFatiga`.

---

## 8. Resolución de Problemas Frecuentes (Troubleshooting)

* **Error `P1001` (No se alcanza el servidor de base de datos en `localhost:5432`):** Verificar que el servicio de PostgreSQL en Windows se encuentre en estado *Iniciado* o que el contenedor `safeshift_postgres` en Docker Desktop esté corriendo.
* **Migración limpia tras cambios estructurales en `schema.prisma`:** Ejecutar `npx prisma db push --force-reset` seguido de `node --experimental-strip-types prisma/seed.ts`.
* **Restricción de ejecución de scripts en PowerShell:** Ejecutar previamente `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.
* **Reinicio limpio de datos de demostración:** Ejecutar `node --experimental-strip-types prisma/seed.ts` desde la raíz del proyecto.