import pg from "pg";
import { config } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
});

/**
 * Inicializa las tablas necesarias para la memoria del agente:
 * 1. agent_knowledge: Aprendizajes, reglas y soluciones aprendidas.
 * 2. agent_history: Historial de mensajes y conversaciones.
 * 3. agent_audit_logs: Registro de acciones operativas ejecutadas.
 */
export async function initDatabase(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        -- 1. Base de conocimiento / Aprendizajes de la IA
        CREATE TABLE IF NOT EXISTS agent_knowledge (
          id SERIAL PRIMARY KEY,
          category VARCHAR(100) NOT NULL, -- ej: 'incident_solution', 'rule', 'architecture', 'user_preference'
          topic VARCHAR(255) NOT NULL,    -- ej: 'falla en auth-service', 'limpieza de memoria'
          content TEXT NOT NULL,          -- Descripción detallada de lo aprendido
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Historial de conversaciones
        CREATE TABLE IF NOT EXISTS agent_history (
          id SERIAL PRIMARY KEY,
          role VARCHAR(20) NOT NULL,      -- 'user' o 'agent'
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 3. Registro de auditoría de acciones ejecutadas por la IA
        CREATE TABLE IF NOT EXISTS agent_audit_logs (
          id SERIAL PRIMARY KEY,
          action_name VARCHAR(100) NOT NULL, -- ej: 'restartService'
          parameters JSONB,
          result JSONB,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log("✅ [PostgreSQL] Tablas de memoria del agente listas.");
      return true;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.warn(`⚠️ [PostgreSQL] No se pudo conectar a la base de datos (${error.message}).`);
    console.warn("   Verifica las credenciales en tu archivo .env");
    return false;
  }
}
