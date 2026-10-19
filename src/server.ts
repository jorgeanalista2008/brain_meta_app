import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config/env.js";
import { initDatabase, pool, logErrorToDb } from "./database/db.js";
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
  console.log("📨 [/api/chat] Recibida petición:", req.body);
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "El campo 'message' es requerido." });
    }

    const reply = await agent.run(message);
    console.log("✅ [/api/chat] Respuesta generada, enviando al cliente...");
    res.json({ reply });
  } catch (error: any) {
    console.error("❌ [/api/chat] Error al procesar mensaje:", error);
    // Guardar automáticamente el error en la tabla agent_error_logs
    await logErrorToDb("api_chat", error, { message: req.body?.message });
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
      LIMIT 50;
    `);
    res.json({ knowledge: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para guardar una regla directamente desde el formulario
app.post("/api/knowledge", async (req, res) => {
  try {
    const { category, topic, content } = req.body;
    if (!category || !topic || !content) {
      return res.status(400).json({ error: "Todos los campos (category, topic, content) son obligatorios." });
    }

    const query = `
      INSERT INTO agent_knowledge (category, topic, content)
      VALUES ($1, $2, $3)
      RETURNING id, category, topic, content, created_at;
    `;
    const result = await pool.query(query, [category, topic, content]);
    console.log(`📚 [Regla Agregada] '${topic}' [${category}]`);
    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (error: any) {
    console.error("Error al guardar regla en PostgreSQL:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para eliminar una regla
app.delete("/api/knowledge/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM agent_knowledge WHERE id = $1;", [id]);
    res.json({ success: true, message: `Regla ${id} eliminada.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para consultar el historial de errores e incidentes
app.get("/api/errors", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, source, error_message, stack_trace, metadata, resolved, occurred_at 
      FROM agent_error_logs 
      ORDER BY occurred_at DESC 
      LIMIT 30;
    `);
    res.json({ errors: result.rows });
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

  const PORT = config.port || 4000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 [Servidor Web] Control Center activo en: http://127.0.0.1:${PORT}`);
  });
}
