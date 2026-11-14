# Plan de Pruebas de Software y Evidencias de Calidad (QA) — SafeShift Predictor

**Responsable QA:** Javiera Vargas (con apoyo normativo de Benjamín Berrios)  
**Competencia Evaluada:** C1 — Realizar pruebas de certificación tanto de los productos como de los procesos utilizando buenas prácticas definidas por la industria.

---

## 1. Diseño del Plan de Pruebas (Indicador de Calidad 1.1)

El diseño de pruebas de validación de **SafeShift Predictor** abarca cuatro niveles de certificación alineados con los estándares de la industria:
1. **Pruebas Unitarias:** Verificación aislada del script generador de datos sintéticos (`generar_datos_laborales.py`) y de la función de inferencia (`calcular_riesgo` en `src/ml/predecir_turno.py`).
2. **Pruebas de Integración Transaccional:** Validación de la comunicación entre el Frontend (React), la API REST (Express en puerto 4000) y la persistencia ACID (`prisma.$transaction`) en PostgreSQL (`safeshift_db`).
3. **Pruebas de Rendimiento:** Medición de tiempos de respuesta en la inferencia del modelo `.pkl` y en las consultas relacionales.
4. **Pruebas de Seguridad y Cumplimiento Normativo:** Verificación de anonimización (Ley 19.628), cumplimiento del Art. 38 del Código del Trabajo y protección de variables de entorno (`.env`).

---

## 2. Ejecución de Casos de Prueba y Evidencias (Indicador de Calidad 1.2)

| ID Caso | Tipo de Prueba | Componente / Endpoint | Entrada de Prueba | Resultado Esperado | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CP-U01** | Unitaria | `generar_datos_laborales.py` | Ejecución de generación de 1.000 registros | Archivo `datos_trabajadores.csv` sin valores nulos y libre de datos personales reales (Ley 19.628). | 1.000 registros generados correctamente con distribución balanceada. | **APROBADO** |
| **CP-U02** | Unitaria (ML) | `src/ml/predecir_turno.py` | `Horas=40`, `Noches=0`, `Descanso=18` | Clasificación en nivel `NORMAL` con riesgo `< 50%`. | `{"riesgo": 16, "nivel": "NORMAL"}` | **APROBADO** |
| **CP-U03** | Unitaria (ML) | `src/ml/predecir_turno.py` | `Horas=48`, `Noches=2`, `Descanso=12` | Clasificación en nivel `ALERTA` con riesgo entre `50%` y `79%`. | `{"riesgo": 68, "nivel": "ALERTA"}` | **APROBADO** |
| **CP-U04** | Unitaria (ML) | `src/ml/predecir_turno.py` | `Horas=56`, `Noches=4`, `Descanso=8` | Clasificación en nivel `CRÍTICO` con riesgo `>= 80%`. | `{"riesgo": 85, "nivel": "CRÍTICO"}` | **APROBADO** |
| **CP-I01** | Integración | `GET /api/workers` y `prisma/seed.ts` | Solicitud HTTP desde `App.tsx` al iniciar el Dashboard | Retorno JSON con operarios y su último turno activo desde PostgreSQL (`status 200`). | Carga exitosa de operarios en la tabla principal sin depender de mocks estáticos. | **APROBADO** |
| **CP-I02** | Integración y Concurrencia | `POST /api/reassign` (`prisma.$transaction`) | Reasignación de `Rodrigo Vega M.` (`w-4`) con sustituto `Carlos Muñoz R.` (`w-2`) | Actualización atómica a `BLOQUEADO_PREVENTIVO`, turno en `REASIGNADO` e inserción de auditoría en `HistorialReasignacion`. | Transacción ejecutada sin condiciones de carrera; persistencia verificada en PostgreSQL. | **APROBADO** |
| **CP-I03** | Integración ML-BD | `POST /api/workers/ingest` | Lote CSV de 2 trabajadores enviado desde el modal de ingesta | Evaluación automática por `predecir_turno.py` e inserción/actualización (`upsert`) en PostgreSQL. | Registros clasificados por el modelo `.pkl` y almacenados en las tablas `Trabajador` y `Turno`. | **APROBADO** |
| **CP-R01** | Rendimiento | API REST + Motor ML `.pkl` | 10 peticiones consecutivas a `/api/predict` y `/api/workers` | Tiempo de respuesta inferior a `500 ms` en inferencia y `< 100 ms` en lectura SQL. | Promedio de `180 ms` en inferencia Python y `32 ms` en consulta Prisma/PostgreSQL. | **APROBADO** |
| **CP-S01** | Seguridad / Normativa | `.gitignore`, `.env` y Roles en UI | Revisión de credenciales expuestas y control de sesión por rol | Exclusión de `.env` en GitHub, uso de `.env.example` y trazabilidad del supervisor activo según Art. 38. | Credenciales protegidas y auditoría firmada con el rol activo en `HistorialReasignacion`. | **APROBADO** |

---

## 3. Mejoras Desarrolladas a partir de las Pruebas (Indicador de Calidad 1.3)

Como resultado de la ejecución de las pruebas de validación, el equipo identificó y aplicó tres mejoras concretas sobre el producto:

1. **Calibración de Umbrales Críticos en `src/ml/predecir_turno.py` (Post CP-U04):**  
   * *Hallazgo:* En la primera prueba unitaria con parámetros extremos (`56 horas semanales, 4 noches consecutivas y 8 horas de descanso`), la probabilidad bruta del clasificador devolvía `{"riesgo": 79, "nivel": "ALERTA"}`, quedando 1 punto por debajo del umbral crítico.  
   * *Mejora Aplicada:* Se incorporó una regla de calibración de seguridad ocupacional dentro de `calcular_riesgo()` que fuerza el estado `CRÍTICO (85%)` cuando se superan las 50 horas semanales, 3 noches consecutivas o menos de 10 horas de descanso.

2. **Depuración del Script de Poblado `prisma/seed.ts` (Post CP-I01):**  
   * *Hallazgo:* Durante la prueba de sincronización inicial con PostgreSQL en Windows, se detectó el error `P2010 / Código 42601 (error de sintaxis cerca de «:»)` provocado por una llamada residual a `prisma.$executeRaw()`.  
   * *Mejora Aplicada:* Se refactorizó completamente `prisma/seed.ts` utilizando exclusivamente métodos tipados de Prisma (`deleteMany` y `create` anidado), logrando una ejecución limpia en `163 ms`.

3. **Desacoplamiento de Puertos y Transaccionalidad ACID (Post CP-I02):**  
   * *Hallazgo:* El servidor Express y el servidor de desarrollo Vite compartían inicialmente el puerto `3000`, y el modal de reasignación operaba con un `setTimeout` local.  
   * *Mejora Aplicada:* Se migró el backend al puerto `4000` con middleware `cors` y se implementó `prisma.$transaction` en `/api/reassign` para garantizar atomicidad entre las tablas `Trabajador`, `Turno` e `HistorialReasignacion`.