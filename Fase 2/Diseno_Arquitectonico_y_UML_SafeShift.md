# Diseño Arquitectónico, Modelo de Datos (3FN) y Diagramas UML — SafeShift Predictor

**Proyecto:** SafeShift Predictor: Sistema Predictivo de Fatiga y Prevención de Riesgos Laborales  
**Asignatura:** Capstone (PTY4614) — Ingeniería en Informática, Duoc UC (Sede Plaza Vespucio)  
**Responsable Documentación y Normativa:** Benjamín Berrios  
**Arquitectura Backend y Datos (3FN):** Ignacio Cuevas  

---

## 1. Arquitectura de la Solución (N-Tier en 3 Capas Contenerizadas)

El sistema implementa una arquitectura desacoplada en tres capas orquestadas mediante `docker-compose.yml`, garantizando aislamiento entre la interfaz de usuario, la lógica transaccional y la persistencia/inferencia predictiva:

~~~mermaid
flowchart LR
    User((Supervisor / Analista RRHH / Prevencionista))

    subgraph Docker [Infraestructura Contenerizada — Docker Compose]
        subgraph Capa1 [Capa de Presentación — Puerto 3000]
            UI[Frontend SPA: React 19 + TypeScript + Vite + Tailwind\nLogin RBAC, Turnos, Motor ML Caja Blanca, Historial CSV, Reportes]
        end

        subgraph Capa2 [Capa de Negocio API REST — Puerto 4000]
            API[Backend Node.js + Express + TypeScript\nsrc/index.ts — Control Concurrencia RNF02 HTTP 409]
            ORM[Prisma ORM Client\nTransacciones ACID prisma.$transaction]
        end

        subgraph Capa3 [Capa de Persistencia y Motor ML]
            DB[(PostgreSQL 15 — safeshift_db\nPuerto 5432 | 5 Tablas Normalizadas 3FN)]
            PY[Script Inferencia Python\nsrc/ml/predecir_turno.py]
            PKL[[Modelo RandomForestClassifier\nmotor_predictivo_safeshift.pkl]]
        end
    end

    User -- "Navegador Web (HTTP)" --> UI
    UI -- "REST API / JSON" <--> API
    API --> ORM
    ORM -- "Consultas SQL Tipadas / JOIN 3FN" <--> DB
    API -- "execFile(horas, noches, descanso)\nAnonimizado Ley 19.628" --> PY
    PY -- "joblib.load()" --> PKL
~~~

---

## 2. Modelo Relacional Normalizado en Tercera Forma Normal (3FN)

A partir de la retroalimentación docente sobre la Competencia **C3**, el modelo fue refactorizado para cumplir estrictamente con **1FN, 2FN y 3FN**:

* **1FN (Atomicidad):** Se eliminó el texto JSON multivaluado de `PrediccionFatiga`, descomponiéndolo en columnas escalares atómicas (`riesgo_porcentaje`, `nivel_riesgo`, `peso_horas`, `peso_noches`, `peso_descanso` y `factor_critico`).
* **2FN y 3FN (Sin dependencias transitivas ni redundancia):** `Trabajador` retiene exclusivamente atributos maestros y estado de disponibilidad operativa, mientras que `HistorialReasignacion` reemplaza todos los textos repetidos por tres Claves Foráneas puras (`trabajadorOrigenId`, `trabajadorReemplazoId` y `usuarioId` conectada a `Usuario`), eliminando cualquier tabla aislada.

~~~mermaid
erDiagram
    Usuario {
        Int id PK
        String rut UK
        String nombre
        String rol
        String email UK
        String password_hash
        Boolean activo
        DateTime creadoEn
    }

    Trabajador {
        String id PK
        String rut UK
        String nombre
        String apellido
        String cargo
        String estado_disponibilidad
        Int ultimo_descanso_horas
        Boolean activo
    }

    Turno {
        Int id PK
        String trabajadorId FK
        String tipo_turno
        DateTime fecha_inicio
        DateTime fecha_fin
        Int horas_acumuladas_semana
        Int descansos_compensatorios
        Int noches_consecutivas
        String estado_turno
    }

    PrediccionFatiga {
        Int id PK
        String trabajadorId FK
        DateTime fecha_calculo
        Int riesgo_porcentaje
        String nivel_riesgo
        Int peso_horas
        Int peso_noches
        Int peso_descanso
        String factor_critico
    }

    HistorialReasignacion {
        Int id PK
        String fecha
        String trabajadorOrigenId FK
        String trabajadorReemplazoId FK
        Int usuarioId FK
        String accion
        String motivo
        DateTime creadoEn
    }

    Trabajador ||--o{ Turno : "tiene"
    Trabajador ||--o{ PrediccionFatiga : "registra"
    Trabajador ||--o{ HistorialReasignacion : "es_origen"
    Trabajador ||--o{ HistorialReasignacion : "es_reemplazo"
    Usuario ||--o{ HistorialReasignacion : "autoriza"
~~~

### 2.1. Diccionario de Datos (3FN)

| Tabla | Claves | Columnas | Descripción Normativa / Técnica |
| :--- | :--- | :--- | :--- |
| **`Usuario`** | PK: `id`<br>UK: `rut`, `email` | `nombre`, `rol`, `password_hash`, `activo`, `creadoEn` | Cuentas corporativas RBAC (`Supervisor de Turno`, `Analista RRHH`, `Prevencionista`). Firma mediante FK los registros de auditoría. |
| **`Trabajador`** | PK: `id`<br>UK: `rut` | `nombre`, `apellido`, `cargo`, `estado_disponibilidad`, `ultimo_descanso_horas`, `activo` | Entidad maestra de la flota (24 operarios). Estados válidos: `DISPONIBLE`, `EN_TURNO`, `BLOQUEADO_PREVENTIVO`. |
| **`Turno`** | PK: `id`<br>FK: `trabajadorId` | `tipo_turno`, `fecha_inicio`, `fecha_fin`, `horas_acumuladas_semana`, `descansos_compensatorios`, `noches_consecutivas`, `estado_turno` | Variables operativas que alimentan el clasificador de fatiga y registran el cambio de estado a `REASIGNADO`. |
| **`PrediccionFatiga`** | PK: `id`<br>FK: `trabajadorId` | `fecha_calculo`, `riesgo_porcentaje`, `nivel_riesgo`, `peso_horas`, `peso_noches`, `peso_descanso`, `factor_critico` | Historial atómico (1FN/3FN) de inferencias ejecutadas por el modelo `.pkl` y sus pesos de Explicabilidad Caja Blanca. |
| **`HistorialReasignacion`** | PK: `id`<br>FK: `trabajadorOrigenId`, `trabajadorReemplazoId`, `usuarioId` | `fecha`, `accion`, `motivo`, `creadoEn` | Registro transaccional auditable para cumplimiento del **Art. 38 del Código del Trabajo** sin redundancia de texto. |

---

## 3. Diagrama UML de Casos de Uso

~~~mermaid
flowchart LR
    Sup([Supervisor de Turno])
    RRHH([Analista RRHH / Prevencionista])
    ML([Motor ML Python .pkl])

    subgraph SafeShift [Sistema SafeShift Predictor]
        UC1((CU-01 Iniciar Sesión RBAC))
        UC2((CU-02 Monitorear Flota y Semáforo))
        UC3((CU-03 Simular / Evaluar Fatiga Caja Blanca))
        UC4((CU-04 Ejecutar Reasignación Preventiva ACID))
        UC5((CU-05 Ingresar Turnos Manual / CSV))
        UC6((CU-06 Consultar Historial y Exportar CSV Art. 38))
        UC7((CU-07 Rehabilitar Operario tras Descanso))
        UC8((CU-08 Visualizar Reportes Dinámicos))
    end

    Sup --> UC1
    Sup --> UC2
    Sup --> UC3
    Sup --> UC4
    Sup --> UC5
    Sup --> UC8

    RRHH --> UC1
    RRHH --> UC2
    RRHH --> UC6
    RRHH --> UC7
    RRHH --> UC8

    UC3 -. "<<include>>" .-> ML
    UC5 -. "<<include>>" .-> ML
~~~

---

## 4. Diagrama UML de Secuencia — Reasignación Transaccional y Concurrencia (RNF02)

~~~mermaid
sequenceDiagram
    actor Sup as Supervisor de Turno
    participant UI as Frontend React (Puerto 3000)
    participant API as API Express (Puerto 4000)
    participant DB as PostgreSQL 15 (Prisma 3FN)

    Sup->>UI: Clic en "REASIGNAR" sobre operario en riesgo CRÍTICO
    UI-->>Sup: Muestra modal con sustitutos filtrados (RF05: riesgo NORMAL y DISPONIBLE)
    Sup->>UI: Selecciona medida Art. 38, sustituto y motivo; confirma
    UI->>API: POST /api/reassign { workerId, substituteId, accionPreventiva, motivo, usuarioId }
    API->>DB: Consulta estado_disponibilidad de Trabajador origen

    alt Operario ya está BLOQUEADO_PREVENTIVO (Concurrencia RNF02)
        DB-->>API: estado_disponibilidad == BLOQUEADO_PREVENTIVO
        API-->>UI: HTTP 409 Conflict ("Ya bloqueado por otro supervisor")
        UI-->>Sup: Muestra alerta de bloqueo de concurrencia
    else Operario elegible y sustituto válido (RF05)
        API->>DB: BEGIN prisma.$transaction (ACID)
        DB->>DB: UPDATE Trabajador origen -> BLOQUEADO_PREVENTIVO
        DB->>DB: UPDATE Trabajador sustituto -> EN_TURNO
        DB->>DB: UPDATE Turno activo -> REASIGNADO
        DB->>DB: INSERT HistorialReasignacion (FK origen, FK reemplazo, FK usuarioId)
        DB-->>API: COMMIT exitoso
        API-->>UI: HTTP 200 OK { ok: true, data }
        UI-->>Sup: Actualiza tabla de turnos, KPIs y bitácora RRHH en vivo
    end
~~~

---

## 5. Integración de Endpoints REST (Contrato Backend — Frontend)

| Método | Ruta API | Función Principal | Regla / Estándar Asociado |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Verifica disponibilidad del servicio y conexión a PostgreSQL 3FN. | RNF03 (Docker Healthcheck) |
| `POST` | `/api/auth/login` | Valida credenciales contra la tabla `Usuario`. | RF01 (RBAC / HTTP 401) |
| `GET` | `/api/workers` | Ensambla los 24 operarios vía `JOIN` 3FN ordenados por riesgo. | RF02 / C3 |
| `GET` | `/api/history` | Reconstruye la bitácora de auditoría desde las 3 FK de `HistorialReasignacion`. | RF06 / Art. 38 |
| `POST` | `/api/reassign` | Ejecuta bloqueo preventivo, asigna sustituto y audita en transacción ACID. | RF04, RF05, RNF02 (HTTP 409) |
| `POST` | `/api/workers/release` | Rehabilita operario tras cumplir descanso compensatorio. | RF06 / Art. 38 |
| `POST` | `/api/predict` | Invoca `predecir_turno.py` (`.pkl`) y guarda métricas atómicas en `PrediccionFatiga`. | RF03 / RNF01 (Ley 19.628) |
| `GET` | `/api/predictions` | Obtiene las últimas 12 inferencias registradas con desglose Caja Blanca. | RF03 / RNF04 |
| `POST` | `/api/ml/recalculate-all` | Re-evalúa toda la flota contra el modelo `.pkl` en vivo. | RF03 |
| `POST` | `/api/workers/ingest` | Ingesta manual o masiva (CSV) evaluando cada turno con ML. | RF03 / C4 |
