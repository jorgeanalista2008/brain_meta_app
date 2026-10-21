import pg from "pg";
import { config } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool(
  config.db.connectionString
    ? {
        connectionString: config.db.connectionString,
        ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
      }
    : {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
      }
);

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
        -- 0. Tabla de Usuarios para Autenticación Privada
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(150) NOT NULL,
          role VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 1. Base de conocimiento / Aprendizajes de la IA
        CREATE TABLE IF NOT EXISTS agent_knowledge (
          id SERIAL PRIMARY KEY,
          category VARCHAR(100) NOT NULL,
          topic VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Historial de conversaciones privadas por usuario
        CREATE TABLE IF NOT EXISTS agent_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL,      -- 'user' o 'agent'
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Garantizar columna user_id en instalaciones existentes
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'agent_history' AND column_name = 'user_id'
          ) THEN
            ALTER TABLE agent_history ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
          END IF;
        END $$;

        -- 3. Registro de auditoría de acciones ejecutadas por la IA
        CREATE TABLE IF NOT EXISTS agent_audit_logs (
          id SERIAL PRIMARY KEY,
          action_name VARCHAR(100) NOT NULL, -- ej: 'restartService'
          parameters JSONB,
          result JSONB,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 4. Registro de errores e incidentes del sistema y de la IA
        CREATE TABLE IF NOT EXISTS agent_error_logs (
          id SERIAL PRIMARY KEY,
          source VARCHAR(100) NOT NULL,       -- ej: 'agent_runner', 'api_chat', 'database', 'tool_execution'
          error_message TEXT NOT NULL,        -- Mensaje del error
          stack_trace TEXT,                   -- Traza completa del error
          metadata JSONB,                     -- Contexto extra (prompt del usuario, argumentos de la herramienta, etc.)
          resolved BOOLEAN DEFAULT FALSE,     -- Si el error fue mitigado o resuelto
          occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 5. Categorías dinámicas para organizar el conocimiento
        CREATE TABLE IF NOT EXISTS agent_categories (
          id SERIAL PRIMARY KEY,
          slug VARCHAR(50) UNIQUE NOT NULL,   -- ej: 'rule', 'security', 'billing'
          name VARCHAR(100) NOT NULL,         -- ej: 'Regla Operativa', 'Seguridad'
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Insertar categorías por defecto si no existen
        INSERT INTO agent_categories (slug, name, description)
        VALUES 
          ('rule', 'Regla Operativa', 'Procedimientos y políticas operativas del sistema'),
          ('incident_solution', 'Solución a Incidente', 'Acciones y resoluciones de contingencias pasadas'),
          ('architecture', 'Arquitectura e Infraestructura', 'Políticas de servidores, microservicios y bases de datos'),
          ('user_preference', 'Preferencia de Administrador', 'Reglas y preferencias de comunicación del equipo')
        ON CONFLICT (slug) DO NOTHING;
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

/**
 * Guarda un error en la tabla agent_error_logs para auditoría y resolución
 */
export async function logErrorToDb(
  source: string,
  error: any,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const query = `
      INSERT INTO agent_error_logs (source, error_message, stack_trace, metadata)
      VALUES ($1, $2, $3, $4);
    `;
    const message = error?.message || String(error);
    const stack = error?.stack || null;
    await pool.query(query, [source, message, stack, JSON.stringify(metadata || {})]);
  } catch (err: any) {
    console.error("Fallo al guardar log de error en PostgreSQL:", err.message);
  }
}
