# SafeShift Predictor

# Descripción del Proyecto
SafeShift Predictor" es un Sistema Predictivo de Fatiga y Prevención de Riesgos Laborales orientado al sector logístico y de transporte de carga en Chile. El proyecto busca transformar la gestión del capital humano desde un enfoque reactivo hacia un modelo proactivo. Mediante el análisis de datos operativos (horas de turno, descansos compensatorios, turnos de noche), el sistema identifica umbrales críticos de desgaste laboral, permitiendo a las gerencias intervenir tempranamente y reasignar tareas en tiempo real. Esto protege la integridad física de los trabajadores, asegura la continuidad operativa y garantiza el cumplimiento normativo.

# Tecnologías Utilizadas
* **Frontend:** React / Next.js con TypeScript.
* **Backend:** Node.js / Express con TypeScript.
* **Base de Datos y ORM:** PostgreSQL + Prisma ORM.
* **Inteligencia Artificial:** Python, FastAPI, Scikit-Learn.
* **Infraestructura:** Docker y Docker Compose.

# Instrucciones para Ejecución Local
*(Nota: Estas instrucciones se irán actualizando durante la Fase 2 del desarrollo).*
1. Clonar este repositorio: `git clone https://github.com/tu-usuario/safeshift-predictor.git`
2. Instalar Docker Desktop en la máquina local.
3. Ejecutar el comando de orquestación (por definir): `docker-compose up -d`
4. Acceder al dashboard en `http://localhost:3000`

# Integrantes del Equipo y Roles
* **Ignacio Cuevas:** Ingeniero Backend (Node.js/TypeScript), Arquitectura de Datos (Prisma ORM) y DevOps (Docker).
* **Benjamín Berríos:** Analista de Gestión de Personas, Normativa Laboral y Reglas de Negocio.
* **Javiera Vargas:** Ingeniera de Machine Learning, Generación de Datos Sintéticos y QA Automatizado.
* **Matías Carrasco:** Ingeniero Frontend (React/TypeScript), Integración de Sistemas y UI/UX.

# Metodología de Trabajo
Se utiliza un enfoque metodológico híbrido:
1. **CRISP-DM:** Aplicado al módulo de Machine Learning (comprensión del negocio, preparación de datos sintéticos sin sesgos, modelado y evaluación).
2. **Scrum / Desarrollo Iterativo:** Aplicado a la arquitectura y desarrollo web, utilizando Sprints cortos, historias de usuario y revisiones continuas.

# Arquitectura de la Solución
El sistema utiliza una arquitectura N-Tier orquestada mediante Docker. El Frontend (React/TypeScript) consume una API REST transaccional (Node.js/Prisma) que gestiona las operaciones ACID en PostgreSQL. La API se comunica internamente con un microservicio analítico aislado en Python, el cual fue entrenado previamente con un script generador de datos sintéticos (cumpliendo la Ley 19.628) para predecir el riesgo de fatiga.
