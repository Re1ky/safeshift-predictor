# Documento de Diseño Arquitectónico, Modelo de Datos (DER) y Diagramas UML — SafeShift Predictor

**Responsable:** Benjamín Berrios (en colaboración con Ignacio Cuevas)  
**Competencias Evaluadas:** C3 (Construcción de modelos de datos escalables) y C4 (Desarrollo e integración de software).

---

## 1. Arquitectura de la Solución

**SafeShift Predictor** implementa una arquitectura cliente-servidor desacoplada en **3 capas** contenerizada mediante Docker:

1. **Capa de Presentación (Frontend — Puerto `3000`):** Aplicación SPA construida con **React 19, TypeScript, Vite y Tailwind CSS**. Proporciona el Dashboard de Turnos Activos, el Modal de Reasignación Preventiva, el Módulo de Ingesta Manual/CSV, el Control de Acceso por Roles y el Historial Transaccional de RRHH.
2. **Capa de Lógica de Negocio e Integración (Backend API REST — Puerto `4000`):** Servidor **Node.js + Express + TypeScript** que expone los endpoints transaccionales (`/api/workers`, `/api/history`, `/api/reassign`, `/api/predict`, `/api/workers/ingest`), gestionando la comunicación con la base de datos a través de **Prisma ORM** e invocando el motor de Machine Learning mediante procesos hijos (`node:child_process`).
3. **Capa de Datos y Ciencia de Datos (Persistencia & ML — Puerto `5432`):**
   * **Base de Datos Relacional:** Motor **PostgreSQL 15** (`safeshift_db`) que garantiza integridad referencial y transacciones ACID.
   * **Motor Predictivo ML:** Modelo `RandomForestClassifier` serializado (`src/ml/motor_predictivo_safeshift.pkl`) consumido por `src/ml/predecir_turno.py` y entrenado con `datos_trabajadores.csv` (generado por `generar_datos_laborales.py` bajo la Ley 19.628).

### Diagrama de Arquitectura y Comunicación entre Servicios

```mermaid
graph LR
    subgraph Capa_Presentacion ["Capa de Presentación (Puerto 3000)"]
        UI["React 19 + Vite + Tailwind<br/>(Dashboard Supervisor / RRHH)"]
    end

    subgraph Capa_Negocio ["Capa de Negocio API REST (Puerto 4000)"]
        API["Servidor Node.js + Express<br/>(src/index.ts)"]
        ORM["Prisma ORM Client<br/>(Transacciones ACID)"]
    end

    subgraph Capa_Datos_ML ["Capa de Datos y Motor ML"]
        DB[("PostgreSQL 15<br/>safeshift_db (Puerto 5432)")]
        PY["Script Inferencia Python<br/>(src/ml/predecir_turno.py)"]
        PKL[["Modelo Random Forest<br/>(motor_predictivo_safeshift.pkl)"]]
    end

    UI -- "HTTP JSON (GET / POST)" --> API
    API --> ORM
    ORM -- "SQL Transaccional" --> DB
    API -- "execFile(horas, noches, descanso)" --> PY
    PY -- "joblib.load()" --> PKL