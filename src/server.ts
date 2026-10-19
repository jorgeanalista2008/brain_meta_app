import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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

// Middleware de autenticación opcional / requerida
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, config.jwtSecret, (err: any, user: any) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

app.use(authenticateToken);

// ==========================================
// AUTENTICACIÓN (LOGIN / REGISTRO / ME)
// ==========================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await pool.query("SELECT id FROM users WHERE email = $1;", [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Ya existe una cuenta con este correo." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role, created_at;",
      [name.trim(), cleanEmail, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, config.jwtSecret, {
      expiresIn: "7d",
    });

    res.status(201).json({ success: true, token, user });
  } catch (error: any) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña requeridos." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await pool.query("SELECT id, name, email, password_hash, role FROM users WHERE email = $1;", [cleanEmail]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, config.jwtSecret, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error: any) {
    console.error("Error en login:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/auth/me", async (req: any, res) => {
  if (!req.user) {
    return res.status(401).json({ authenticated: false });
  }
  try {
    const result = await pool.query("SELECT id, name, email, role, created_at FROM users WHERE id = $1;", [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ authenticated: true, user: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener el historial privado de mensajes del usuario
app.get("/api/chat/history", async (req: any, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    let query = "";
    let params: any[] = [];

    if (userId) {
      query = "SELECT id, role, content, created_at FROM agent_history WHERE user_id = $1 ORDER BY id ASC LIMIT 50;";
      params = [userId];
    } else {
      query = "SELECT id, role, content, created_at FROM agent_history WHERE user_id IS NULL ORDER BY id ASC LIMIT 50;";
    }

    const result = await pool.query(query, params);
    res.json({ history: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para enviar mensajes al agente
app.post("/api/chat", async (req: any, res) => {
  console.log("📨 [/api/chat] Recibida petición:", req.body);
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "El campo 'message' es requerido." });
    }

    const userId = req.user ? req.user.id : null;

    // Guardar mensaje del usuario en el historial
    await pool.query("INSERT INTO agent_history (user_id, role, content) VALUES ($1, $2, $3);", [
      userId,
      "user",
      message,
    ]);

    const reply = await agent.run(message);

    // Guardar respuesta del bot en el historial
    await pool.query("INSERT INTO agent_history (user_id, role, content) VALUES ($1, $2, $3);", [
      userId,
      "agent",
      reply,
    ]);

    console.log("✅ [/api/chat] Respuesta generada y guardada en historial privado...");
    res.json({ reply });
  } catch (error: any) {
    console.error("❌ [/api/chat] Error al procesar mensaje:", error);
    // Guardar automáticamente el error en la tabla agent_error_logs
    await logErrorToDb("api_chat", error, { message: req.body?.message, userId: req.user?.id });
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

// ==========================================
// CRUD DE CATEGORÍAS
// ==========================================

// Obtener todas las categorías
app.get("/api/categories", async (_req, res) => {
  try {
    const result = await pool.query("SELECT id, slug, name, description, created_at FROM agent_categories ORDER BY id ASC;");
    res.json({ categories: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear una nueva categoría
app.post("/api/categories", async (req, res) => {
  try {
    const { slug, name, description } = req.body;
    if (!slug || !name) {
      return res.status(400).json({ error: "El slug y el nombre de la categoría son obligatorios." });
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, "_");
    const query = `
      INSERT INTO agent_categories (slug, name, description)
      VALUES ($1, $2, $3)
      RETURNING id, slug, name, description, created_at;
    `;
    const result = await pool.query(query, [cleanSlug, name.trim(), description?.trim() || null]);
    console.log(`🏷️ [Categoría Creada] '${name}' (${cleanSlug})`);
    res.status(201).json({ success: true, category: result.rows[0] });
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(409).json({ error: `La categoría con slug '${req.body.slug}' ya existe.` });
    }
    res.status(500).json({ error: error.message });
  }
});

// Eliminar una categoría
app.delete("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM agent_categories WHERE id = $1;", [id]);
    res.json({ success: true, message: `Categoría ${id} eliminada.` });
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
