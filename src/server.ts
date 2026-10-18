import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config/env.js";
import { initDatabase, pool } from "./database/db.js";
import { BrainAgent } from "./agent/brainAgent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Servir la interfaz web estática
const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));

const agent = new BrainAgent();

// Endpoint para enviar mensajes al agente
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "El campo 'message' es requerido." });
    }

    const reply = await agent.run(message);
    res.json({ reply });
  } catch (error: any) {
    console.error("Error al procesar mensaje con BrainAgent:", error);
    res.status(500).json({ error: error.message || "Error interno del servidor" });
  }
});

// Endpoint para consultar la memoria persistente en PostgreSQL
app.get("/api/knowledge", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, category, topic, content, created_at 
      FROM agent_knowledge 
      ORDER BY created_at DESC 
      LIMIT 20;
    `);
    res.json({ knowledge: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para consultar auditoría de acciones
app.get("/api/audit", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, action_name, parameters, result, executed_at 
      FROM agent_audit_logs 
      ORDER BY executed_at DESC 
      LIMIT 20;
    `);
    res.json({ auditLogs: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export async function startServer() {
  await initDatabase();

  const PORT = config.port || 3000;
  app.listen(PORT, () => {
    console.log(`\n🚀 [Servidor Web] Control Center activo en: http://localhost:${PORT}`);
  });
}
