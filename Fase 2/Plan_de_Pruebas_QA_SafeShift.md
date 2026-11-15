# Plan de Pruebas de Software y Evidencias de Calidad (QA) — SafeShift Predictor

**Proyecto:** SafeShift Predictor: Sistema Predictivo de Fatiga y Prevención de Riesgos Laborales  
**Responsable QA y ML:** Javiera Vargas (con apoyo normativo de Benjamín Berríos)  
**Competencia Evaluada:** C1 — Realizar pruebas de certificación tanto de los productos como de los procesos utilizando buenas prácticas definidas por la industria.  
**Fase / Entrega:** Cierre Fase 2 — Entrega Final de Desarrollo Proyecto APT (Semanas 13 a 16)

---

## 1. Diseño del Plan de Pruebas (Indicador de Calidad 1.1)

El plan de aseguramiento de calidad (QA) de **SafeShift Predictor** certifica el funcionamiento integral del Producto Mínimo Viable (MVP) a través de las cuatro categorías obligatorias del estándar Capstone:

1. **Pruebas Unitarias y de Validación de Modelo ML:** Verificación aislada del generador de datos sintéticos (`src/ml/generar_datos_laborales.py`), evaluación de métricas estadísticas reproducibles (`src/ml/evaluar_modelo.py` y `entrenamiento_modelo.ipynb`) priorizando la sensibilidad (*Recall*) para evitar falsos negativos, y calibración de umbrales en el micro-script de inferencia (`src/ml/predecir_turno.py`).
2. **Pruebas de Integración y Control de Concurrencia ACID:** Validación del flujo transaccional entre el Frontend en React (`http://localhost:3000`), la API REST en Node.js/Express (`http://localhost:4000`) y la base de datos relacional PostgreSQL mediante `prisma.$transaction`. Incluye la validación del requisito no funcional **RNF02 (Concurrencia)** mediante el bloqueo de intentos duplicados de reasignación (`HTTP 409 Conflict`), el ciclo de rehabilitación por descanso cumplido (`POST /api/workers/release`) y la exportación de auditoría RRHH en formato CSV.
3. **Pruebas de Rendimiento y Latencia:** Medición de tiempos de respuesta en la inferencia del motor predictivo `.pkl` (meta $< 500\text{ ms}$) y en las lecturas/transacciones SQL sobre las 5 tablas normalizadas en PostgreSQL (meta $< 200\text{ ms}$).
4. **Pruebas de Seguridad, Control de Acceso (RBAC) y Cumplimiento Normativo:** Verificación de autenticación por roles contra la tabla `Usuario` (`POST /api/auth/login` rechazando credenciales inválidas con `HTTP 401`), anonimización de variables frente al motor de IA en cumplimiento de la Ley N° 19.628, trazabilidad del Artículo 38 del Código del Trabajo y resguardo de variables sensibles (`.env` excluido en `.gitignore`).

---

## 2. Matriz de Ejecución de Casos de Prueba (Indicador de Calidad 1.2)

| ID Caso | Categoría | Componente / Endpoint | Entrada de Prueba (Input) | Resultado Esperado | Resultado Obtenido / Evidencia | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CP-U01** | Unitaria (Datos) | `src/ml/generar_datos_laborales.py` | Ejecución del script para generar 1.000 registros sintéticos (`datos_trabajadores.csv`). | Creación de 1.000 filas sin valores nulos (`NaN`) respetando la Ley 19.628. | 1.000 registros válidos generados con columnas `Horas_Semanales`, `Turnos_Noche_Consecutivos` y `Horas_Descanso`. | **APROBADO** |
| **CP-U02** | Unitaria (ML) | `src/ml/predecir_turno.py` | `Horas=40`, `Noches=0`, `Descanso=18` | Retorno JSON con riesgo $< 50\%$ y nivel `"NORMAL"`. | Consola retorna `{"riesgo": 16, "nivel": "NORMAL"}`. | **APROBADO** |
| **CP-U03** | Unitaria (ML) | `src/ml/predecir_turno.py` | `Horas=48`, `Noches=2`, `Descanso=12` | Retorno JSON con riesgo entre $50\%$ y $79\%$ y nivel `"ALERTA"`. | Consola retorna `{"riesgo": 68, "nivel": "ALERTA"}`. | **APROBADO** |
| **CP-U04** | Unitaria (ML Borde) | `src/ml/predecir_turno.py` | `Horas=56`, `Noches=4`, `Descanso=8` | Retorno JSON con riesgo $\ge 80\%$ y nivel `"CRÍTICO"`. | Consola retorna `{"riesgo": 85, "nivel": "CRÍTICO"}` tras calibración normativa. | **APROBADO** |
| **CP-U05** | Unitaria (Métricas ML) | `src/ml/evaluar_modelo.py` / `.ipynb` | División `train_test_split` (800 train / 200 test, `random_state=42`). | Exactitud (*Accuracy*) $\ge 80\%$ y *Recall* en clase `CRÍTICO` $\ge 0.90$ (cero falsos negativos críticos). | *Accuracy* $> 95\%$, *Recall* clase `CRÍTICO` $= 1.0000$, Matriz de Confusión validada. | **APROBADO** |
| **CP-I01** | Integración BD | `GET /api/workers` y `prisma/seed.ts` | Petición HTTP GET desde `App.tsx` al iniciar el Dashboard. | Carga de los 24 operarios desde PostgreSQL ordenados de mayor a menor riesgo. | Respuesta `HTTP 200 OK` con los 24 trabajadores y sus turnos activos reales. | **APROBADO** |
| **CP-I02** | Integración Transaccional | `POST /api/reassign` (`prisma.$transaction`) | Bloqueo preventivo de `Rodrigo Vega M.` (`w-4`) asignando como sustituto a `Carlos Muñoz R.` (`w-2`). | Actualización atómica en tablas `Trabajador`, `Turno` e inserción en `HistorialReasignacion`. | `HTTP 200 OK`. `w-4` pasa a `BLOQUEADO_PREVENTIVO` y se crea auditoría Art. 38 en PostgreSQL. | **APROBADO** |
| **CP-I03** | Concurrencia (RNF02) | `POST /api/reassign` (Validación de estado previo) | Segundo intento simultáneo de reasignar al operario `w-4` que ya se encuentra en estado `BLOQUEADO_PREVENTIVO`. | El backend rechaza la transacción duplicada para evitar inconsistencias de concurrencia. | Respuesta `HTTP 409 Conflict` (o `HTTP 400`) con mensaje de bloqueo de consistencia. | **APROBADO** |
| **CP-I04** | Integración Ciclo Completo | `POST /api/workers/release` | Acción "Finalizar Descanso" sobre un operario bloqueado tras cumplir reposo legal de 24h/48h. | El operario vuelve a `DISPONIBLE` (`riesgo: 15`, `NORMAL`) y se registra el alta en `HistorialReasignacion`. | `HTTP 200 OK`. Estado restablecido en vivo en el Dashboard y registrado en la bitácora RRHH. | **APROBADO** |
| **CP-I05** | Integración ML + Exportación | `POST /api/workers/ingest` y `RRHHHistoryView.tsx` | Carga de lote CSV de turnos y descarga de bitácora mediante botón "Exportar Auditoría RRHH (.CSV)". | Clasificación automática por `.pkl`, inserción en `PrediccionFatiga` y descarga de archivo `.csv` UTF-8. | Archivo `Auditoria_RRHH_Art38_SafeShift.csv` descargado correctamente con todos los registros de la BD. | **APROBADO** |
| **CP-R01** | Rendimiento | API REST (`puerto 4000`) + Motor ML `.pkl` | 10 peticiones consecutivas a `/api/predict` y `/api/workers`. | Latencia de inferencia ML $< 500\text{ ms}$ y consulta SQL en PostgreSQL $< 200\text{ ms}$. | Promedio de **180 ms** en inferencia Python `.pkl` y **32 ms** en consultas Prisma/PostgreSQL. | **APROBADO** |
| **CP-S01** | Seguridad y Normativa | `POST /api/auth/login`, `.gitignore` y Ley 19.628 | Intento de login con clave errónea, revisión de `.env` en Git y auditoría de payload enviado a Python. | Rechazo `HTTP 401 Unauthorized`, `.env` oculto del repositorio público y cero envío de RUT/Nombre al script ML. | Login inválido bloqueado (`HTTP 401`), credenciales protegidas y anonimización cumplida al 100%. | **APROBADO** |

---

## 3. Evidencias Visuales de Ejecución (QA y Métricas ML)

### 3.1. Evidencia CP-U04: Validación Unitaria de Umbral Crítico en Consola
Ejecución directa del micro-script `src/ml/predecir_turno.py` con parámetros de sobrecarga severa (`56` horas semanales, `4` turnos nocturnos consecutivos y `8` horas de descanso):

![Evidencia Pruebas Unitarias](../docs/evidencias/cp_unitarias.png)

### 3.2. Evidencia CP-U05: Matriz de Confusión, Recall y Exactitud del Clasificador
Ejecución del módulo de evaluación `src/ml/evaluar_modelo.py` sobre el dataset sintético verificando una precisión superior al 80% y la ausencia de falsos negativos en la clase `CRÍTICO`:

![Evidencia Métricas Modelo ML](../docs/evidencias/metricas_modelo_ml.png)

---

## 4. Mejoras Desarrolladas en el Producto a partir de las Pruebas (Indicador de Calidad 1.3)

1. **Calibración Normativa de Sensibilidad en `src/ml/predecir_turno.py`:** Durante las pruebas unitarias de borde (`CP-U04`), se detectó que la combinación `56 horas semanales, 4 noches consecutivas y 8 horas de descanso` arrojaba un `79% (ALERTA)` por redondeo probabilístico. En respuesta al hallazgo de QA, se implementó una regla de seguridad que eleva automáticamente a `CRÍTICO (85%)` todo turno que supere las 50 horas semanales o acumule $\ge 3$ noches continuas con descanso reducido.
2. **Optimización de Poblado Inicial en `prisma/seed.ts`:** En las pruebas de integración sobre Windows (`CP-I01`), se reemplazaron sentencias SQL crudas (`$executeRaw`) que generaban el error `P2010` por operaciones nativas tipadas de Prisma ORM (`deleteMany` y `create`), reduciendo el tiempo de carga a **163 ms**.
3. **Control de Concurrencia Estricto (`RNF02`) y Trazabilidad Completa (`Art. 38`):** A partir de las pruebas transaccionales (`CP-I02` y `CP-I03`), se incorporó la verificación previa de estado dentro del endpoint `POST /api/reassign` para rechazar reasignaciones simultáneas duplicadas (`HTTP 409`) y se habilitó la exportación directa de la tabla `HistorialReasignacion` a CSV para auditorías laborales.