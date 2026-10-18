# 🧠 Brain Meta App

Agente inteligente autónomo desarrollado en **Node.js + TypeScript** utilizando el SDK oficial de **Google Gemini (`@google/genai`)** con soporte para **Function Calling / Tools**.

Su propósito es funcionar como el cerebro de control, monitoreo, observabilidad y ejecución de operaciones sobre tu aplicación.

---

## 🚀 Características

- **Modelo de IA:** Gemini (`gemini-2.5-flash` o configurable).
- **Tool Calling en tiempo real:**
  - `getSystemHealth`: Inspección de memoria, uptime y estado de bases de datos/servicios.
  - `getAppMetrics`: Consulta de métricas clave (usuarios activos, requests/minuto, tasa de error).
  - `restartService`: Acción de mitigación para reiniciar servicios o microservicios con fallos.
- **Modo interactivo (CLI):** Conversa con el agente directamente desde tu terminal.

---

## 📦 Instalación y Configuración

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
   Agrega tu API Key de Gemini:
   ```env
   GEMINI_API_KEY=tu_api_key_de_google_aqui
   ```

## 🚀 Ejecución Unificada (Cerebro + Frontend Next.js)

Para iniciar simultáneamente el **Cerebro (Backend con Gemini y PostgreSQL)** y la **Interfaz Web (Next.js)** con un solo comando:

```bash
npm run dev
```

Este comando iniciará:
- **🧠 Cerebro (Backend API):** `http://localhost:3000`
- **💻 Frontend (Next.js Dashboard):** `http://localhost:3001` (o `:3000` si Next detecta el puerto).

---

### Comandos individuales disponibles:
- `npm run dev:brain`: Inicia solo el cerebro (backend en TypeScript).
- `npm run dev:front`: Inicia solo la interfaz de Next.js.
- `npm run dev`: Inicia ambos al mismo tiempo.

---

## 🛠️ Cómo agregar tus propias herramientas de la App

Para conectar tu base de datos o endpoints reales:

1. Ve a [`src/tools/appControlTools.ts`](file:///d:/github/brain_meta_app/src/tools/appControlTools.ts).
2. Define la declaración de la función (`FunctionDeclaration`) con los parámetros esperados.
3. Conéctala en el `switch` de la función `executeTool()` hacia tu base de datos (PostgreSQL, MongoDB, etc.) o API interna.
4. Regístrala en [`src/agent/brainAgent.ts`](file:///d:/github/brain_meta_app/src/agent/brainAgent.ts) dentro de la lista de `tools`.
