# Diseño Arquitectónico, Modelo de Datos (3FN) y Diagramas UML — SafeShift Predictor

**Proyecto:** SafeShift Predictor: Sistema Predictivo de Fatiga y Prevención de Riesgos Laborales  
**Asignatura:** Capstone (PTY4614) — Ingeniería en Informática, Duoc UC (Sede Plaza Vespucio)  
**Responsable Documentación y Normativa:** Benjamín Berrios  
**Arquitectura Backend y Datos (3FN):** Ignacio Cuevas  

---

## 1. Arquitectura de la Solución (N-Tier en 3 Capas Contenerizadas)

El sistema implementa una arquitectura desacoplada en tres capas orquestadas mediante `docker-compose.yml`, garantizando aislamiento entre la interfaz de usuario, la lógica transaccional y la persistencia/inferencia predictiva:

```mermaid
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