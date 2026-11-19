# SafeShift Predictor: Sistema Predictivo de Fatiga y Prevención de Riesgos Laborales

## 1. Descripción del Proyecto
**SafeShift Predictor** es una plataforma web predictiva y transaccional orientada al sector de logística, distribución y transporte de carga pesada en Chile.

* **¿Qué problema resuelve?** Reemplaza la gestión reactiva de la fatiga laboral por un modelo preventivo basado en datos, mitigando riesgos de siniestralidad por microsueño y resguardando el cumplimiento del **Artículo 38 del Código del Trabajo** y la **Ley N° 19.628** sobre Protección de la Vida Privada.
* **¿Qué hace?** Procesa variables operativas anónimas (horas semanales acumuladas, turnos nocturnos consecutivos y horas de descanso) mediante un clasificador de Machine Learning (`RandomForestClassifier` con **99,50% de exactitud** y **Recall 1,0000** en clase crítica), ofrece Explicabilidad de Caja Blanca y permite ejecutar reasignaciones de turnos con transacciones ACID, bloqueo de concurrencia (`HTTP 409 Conflict`) y exportación de auditoría RRHH en formato CSV.
* **¿A quién va dirigido?** Supervisores de Operaciones/Despacho, Analistas de Recursos Humanos (RRHH) y Prevencionistas de Riesgos.

## 2. Tecnologías Utilizadas
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Backend:** Node.js (v24+), Express, TypeScript, Prisma ORM.
* **Base de Datos:** PostgreSQL 15 normalizada en **Tercera Forma Normal (3FN)** con 5 entidades (`Usuario`, `Trabajador`, `Turno`, `PrediccionFatiga`, `HistorialReasignacion`).
* **Machine Learning y Ciencia de Datos:** Python 3, Scikit-Learn (`RandomForestClassifier`), Pandas, NumPy, Joblib.
* **DevOps y Portabilidad:** Docker y Docker Compose.

## 3. Arquitectura de la Solución
El sistema opera bajo una arquitectura **N-Tier desacoplada en 3 capas** contenerizada con Docker:
1. **Capa de Presentación (`frontend/`, puerto `3000`):** SPA React con autenticación RBAC, monitoreo de flota (24 operarios), modal de reasignación transaccional, laboratorio ML en vivo, reportes dinámicos y exportación CSV Art. 38.
2. **Capa de Negocio (`src/index.ts`, puerto `4000`):** API REST Express + Prisma ORM con transacciones atómicas (`prisma.$transaction`), control de concurrencia `RNF02` (`HTTP 409`), validación de sustituto `RF05` y puente `execFile` hacia Python.
3. **Capa de Persistencia y Motor ML (`prisma/` y `src/ml/`, puerto `5432`):** PostgreSQL 15 en 3FN conectada por claves foráneas puras (`trabajadorOrigenId`, `trabajadorReemplazoId`, `usuarioId`) y modelo serializado `motor_predictivo_safeshift.pkl`.

## 4. Metodología de Trabajo
El equipo implementó una **Metodología Híbrida**:
* **CRISP-DM:** Para comprensión normativa, generación sintética libre de sesgos (`1.000` registros), entrenamiento/evaluación estratificada del modelo y despliegue productivo.
* **Marco Ágil (Scrum / Kanban):** Para planificación por Sprints, seguimiento documentado en `Fase 2/Daily_Scrum_SafeShift_Predictor.xlsx`, control de versiones en GitHub y ciclos de pruebas QA (`CP-U01` a `CP-S01`).

## 5. Integrantes del Equipo y Roles
| Integrante | RUT | Rol Principal |
| :--- | :--- | :--- |
| **Ignacio Cuevas** | 21.703.347-0 | Ingeniero Backend, Arquitectura de Datos (3FN) y DevOps (Docker) |
| **Benjamín Berrios** | 21.683.327-9 | Analista de Gestión de Personas (RRHH), Reglas de Negocio, Scrum y Documentación |
| **Javiera Vargas** | 21.369.093-0 | Ingeniera de Machine Learning, Datos Sintéticos (Ley 19.628) y QA |
| **Matías Carrasco** | 20.247.894-8 | Ingeniero Frontend React/TypeScript, UI/UX e Integración Transaccional |

## 6. Estructura del Repositorio
~~~text
safeshift-predictor/
├── Fase 1/                                          # Definición Proyecto APT y presentación Fase 1
├── Fase 2/                                          # Documentación, evidencias y cierre Fase 2
│   ├── Informe_Final_Fase_2_SafeShift_Predictor.docx
│   ├── Daily_Scrum_SafeShift_Predictor.xlsx
│   ├── Diseno_Arquitectonico_y_UML_SafeShift.md
│   ├── Plan_de_Pruebas_QA_SafeShift.md
│   ├── Manual_Despliegue_Docker_SafeShift.md
│   ├── Modelo_Entidad-Relacion_DER.png              # DER definitivo en 3FN (5 tablas)
│   ├── Diagrama de Secuencia.jpg
│   └── metricas_modelo_ml.png
├── prisma/                                          # Esquema 3FN y poblado de 24 operarios
├── src/                                             # API REST Express + Motor ML Python (.pkl)
├── frontend/                                        # Dashboard React 19 + Vite + Tailwind
├── Dockerfile                                       # Contenedor Backend (Node.js + Python)
├── docker-compose.yml                               # Orquestación completa (DB, Backend, Frontend)
├── .env.example                                     # Plantilla de variables de entorno
└── README.md
~~~

## 7. Instrucciones de Ejecución Local y con Docker

### Opción A: Despliegue Contenerizado (Docker Compose)
~~~bash
cp .env.example .env
docker compose up -d --build
~~~
* **Frontend:** `http://localhost:3000`
* **API Healthcheck:** `http://localhost:4000/api/health`

### Opción B: Ejecución en Desarrollo Local
~~~powershell
# 1. Instalar dependencias y sincronizar base de datos 3FN
npm install
pip install joblib pandas scikit-learn
npx prisma generate
npx prisma db push
node --experimental-strip-types prisma/seed.ts

# 2. Encender Backend (Terminal 1)
node --experimental-strip-types src/index.ts

# 3. Encender Frontend (Terminal 2)
cd frontend
npm install --legacy-peer-deps
npm run dev
~~~

**Credenciales de Acceso RBAC (Demo):**
* **Supervisor de Turno:** `supervisor@safeshift.cl` / `safeshift2026`
* **Analista RRHH:** `rrhh@safeshift.cl` / `safeshift2026`
* **Prevencionista:** `prevencion@safeshift.cl` / `safeshift2026`
