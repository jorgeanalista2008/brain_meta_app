# 🧠 Brain Meta App

Plataforma inteligente de control, observabilidad y automatización para Meta (WhatsApp Cloud API) y aplicaciones web, impulsada por **Google Gemini (`@google/genai`)**, **Node.js + TypeScript**, **PostgreSQL** y un moderno **Dashboard en Next.js** inspirado en el diseño de **Mapbox Console**.

---

## 🏗️ Arquitectura del Monorepo

El proyecto está organizado en una arquitectura monorepo limpia y desacoplada:

```text
brain_meta_app/
├── backend/                     # Servidor Express, Cerebro Gemini, PostgreSQL y Webhook de Meta
│   ├── src/
│   │   ├── agent/               # Lógica del agente central (BrainAgent con Gemini)
│   │   ├── config/              # Gestión de variables de entorno (.env)
│   │   ├── database/            # Conexión a PostgreSQL (Pool) y script de migraciones
│   │   ├── services/            # Clientes externos (WhatsApp Cloud API)
│   │   ├── tools/               # Declaración e implementación de Function Calling
│   │   │   ├── appControlTools  # Telemetría, métricas y reinicio de servicios
│   │   │   └── memoryTools      # Memoria a largo plazo, reglas y base de conocimiento
│   │   ├── server.ts            # Servidor Express, Webhook (/webhook) y API REST
│   │   └── index.ts             # Punto de entrada
│   ├── .env                     # Variables de entorno locales del backend
│   ├── package.json             # Dependencias y scripts exclusivos del backend
│   └── tsconfig.json            # Configuración de TypeScript
│
├── frontend/                    # Consola de Control Web estilo Mapbox Console
│   ├── src/
│   │   └── app/                 # Next.js App Router (Páginas, componentes, modales)
│   ├── package.json             # Dependencias de frontend (Tailwind CSS, SweetAlert2, Lucide)
│   └── next.config.mjs          # Proxy inverso hacia el backend (:4000)
│
├── package.json                 # Orquestador raíz para ejecución concurrente
└── README.md                    # Documentación del sistema
```

---

## ✨ Características Principales

### 1. 🧠 Cerebro Autónomo con Gemini (`gemini-3.1-flash-lite`)
- **Function Calling en tiempo real**: Capacidad de interactuar con el sistema a través de herramientas programadas.
- **Herramientas de Observabilidad**:
  - `getSystemHealth`: Estado de CPU, consumo de memoria RSS/Heap y uptime.
  - `getAppMetrics`: Monitoreo de solicitudes por minuto, latencia y telemetría de negocio.
  - `getRegisteredUsers`: Consulta en tiempo real a PostgreSQL de los operadores y usuarios registrados.
  - `restartService`: Reinicio de servicios o microservicios con auditoría automática.

### 2. 💾 Memoria Persistente y Aprendizaje en PostgreSQL
- **Base de Conocimiento Dinámica (`agent_knowledge`)**: El agente recuerda reglas operativas, soluciones a incidentes y procedimientos.
- **Gestor de Categorías (`agent_categories`)**: Clasificación por reglas, arquitectura, soluciones a incidentes, etc.
- **Registro de Errores e Incidentes (`agent_error_logs`)**: Bitácora para diagnóstico y resolución de problemas.
- **Registro de Auditoría (`agent_audit_logs`)**: Trazabilidad de todas las acciones ejecutadas por el cerebro.

### 3. 🔐 Seguridad, Autenticación y Privacidad
- **Acceso Restringido (Login Gate)**: Panel bloqueado para usuarios no autenticados.
- **Cuentas y Sesiones**: Autenticación con **JWT** y encriptación de contraseñas con **bcryptjs**.
- **Historial Privado de Chat (`agent_history`)**: Cada operador tiene su propio hilo de conversación privado y persistido en PostgreSQL.

### 4. 📲 Integración con WhatsApp Cloud API (Meta Webhook)
- **Verificación Automática (`GET /webhook`)**: Compatible con el protocolo de verificación de Meta (`hub.mode`, `hub.verify_token`, `hub.challenge`).
- **Receptor y Procesador de Mensajes (`POST /webhook`)**: Recibe mensajes de WhatsApp en tiempo real, los procesa con **BrainAgent** y responde de forma automática mediante la Graph API de Meta.

### 5. 💻 Consola Web (Estilo Mapbox Console)
- Interfaz moderna, limpia y profesional construida en **Next.js (App Router)** y **Tailwind CSS**.
- Diálogos y notificaciones intuitivas con **SweetAlert2**.
- Pestañas interactivas:
  - **Dashboard General**: Telemetría, estado del servidor y métricas de salud.
  - **Chat de Operaciones**: Interacción directa con el agente con historial privado.
  - **Base de Conocimiento**: CRUD visual para registrar y consultar reglas operativas.
  - **Categorías**: Gestión y clasificación del conocimiento del agente.
  - **Incidentes y Errores**: Monitoreo de logs y excepciones del sistema.

---

## 🚀 Inicio Rápido

### 1. Clonar el repositorio
```bash
git clone https://github.com/jorgeanalista2008/brain_meta_app.git
cd brain_meta_app
```

### 2. Instalar dependencias
Instala las dependencias en la raíz y en cada submódulo:
```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 3. Configurar variables de entorno
Crea tu archivo `backend/.env` (puedes basarte en `backend/.env.example`):
```env
# Gemini API
GEMINI_API_KEY=tu_gemini_api_key

# Configuración del Servidor
PORT=4000
JWT_SECRET=tu_secreto_para_jwt_aqui

# PostgreSQL Local o Remoto (ej. Supabase)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_contraseña_postgres
DB_NAME=brain_meta_db

# Meta WhatsApp Cloud API
META_VERIFY_TOKEN=brain_meta_verify_token_secure_2026
META_ACCESS_TOKEN=tu_token_de_acceso_temporal_o_permanente_de_meta
META_PHONE_NUMBER_ID=tu_phone_number_id_de_whatsapp
META_API_VERSION=v21.0
```

### 4. Ejecutar migraciones de Base de Datos
Crea las tablas necesarias en PostgreSQL automáticamente:
```bash
npm run db:migrate
```

### 5. Levantar el proyecto en desarrollo
Para iniciar tanto el **Backend (:4000)** como el **Frontend (:3000)** con un solo comando:
```bash
npm run dev
```

El sistema estará accesible en:
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend API & Webhook:** [http://localhost:4000](http://localhost:4000)

---

## 📜 Scripts Disponibles

Desde la raíz del proyecto puedes ejecutar:

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia Backend (`:4000`) y Frontend (`:3000`) simultáneamente. |
| `npm run dev:backend` | Inicia únicamente el servidor del Cerebro Backend. |
| `npm run dev:frontend` | Inicia únicamente la consola web Next.js. |
| `npm run db:migrate` | Ejecuta las migraciones de esquemas en PostgreSQL. |
| `npm run build` | Compila TypeScript en el backend y genera el build de producción de Next.js. |
| `npm run start` | Arranca ambos servicios en modo producción. |

---

## 🌐 Conectar con Meta Developers (WhatsApp Cloud API)

1. En el panel de **Meta for Developers**, selecciona tu App y ve a **WhatsApp** > **Configuración**.
2. En la sección **Webhook**, haz clic en **Editar**:
   - **URL de devolución de llamada:** `https://tu-dominio-o-tunel.com/webhook`
   - **Identificador de verificación:** El valor definido en `META_VERIFY_TOKEN` (por defecto `brain_meta_verify_token_secure_2026`).
3. Haz clic en **Verificar y Guardar**.
4. En **Administrar campos de webhook**, suscríbete al campo **`messages`**.

---

## 📄 Licencia

Este proyecto está desarrollado bajo la licencia **MIT**.
