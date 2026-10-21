import { FunctionDeclaration, Type } from "@google/genai";
import { pool } from "../database/db.js";

// Declaración: Guardar un aprendizaje en la memoria a largo plazo
export const saveLearnedKnowledgeDeclaration: FunctionDeclaration = {
  name: "saveLearnedKnowledge",
  description: "Guarda un aprendizaje, regla operativa, preferencia del usuario o solución a un problema en la memoria permanente del agente.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: "Categoría: 'incident_solution', 'rule', 'architecture', 'user_preference' o 'general'.",
      },
      topic: {
        type: Type.STRING,
        description: "Tema o título clave del aprendizaje (ej: 'Procedimiento ante saturación de base de datos').",
      },
      content: {
        type: Type.STRING,
        description: "Descripción detallada del aprendizaje o solución.",
      },
    },
    required: ["category", "topic", "content"],
  },
};

// Declaración: Consultar la memoria de aprendizajes
export const searchLearnedKnowledgeDeclaration: FunctionDeclaration = {
  name: "searchLearnedKnowledge",
  description: "Busca en la memoria permanente de PostgreSQL conocimientos o soluciones aprendidas previamente.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Palabras clave o tema que se desea recordar/buscar.",
      },
    },
    required: ["query"],
  },
};

// Declaración: Consultar el historial de errores e incidentes
export const getErrorLogsDeclaration: FunctionDeclaration = {
  name: "getErrorLogs",
  description: "Consulta los últimos errores e incidentes registrados en PostgreSQL para diagnóstico.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.NUMBER,
        description: "Cantidad de errores a consultar (por defecto 5).",
      },
      unresolvedOnly: {
        type: Type.BOOLEAN,
        description: "Si es true, solo trae errores no resueltos. Por defecto false.",
      },
    },
  },
};

// Funciones para interactuar con PostgreSQL
export async function saveLearnedKnowledge(category: string, topic: string, content: string) {
  const query = `
    INSERT INTO agent_knowledge (category, topic, content)
    VALUES ($1, $2, $3)
    RETURNING id, topic, created_at;
  `;
  const res = await pool.query(query, [category, topic, content]);
  return {
    success: true,
    savedItem: res.rows[0],
    message: `Aprendizaje guardado con éxito bajo el tema: '${topic}'`,
  };
}

export async function searchLearnedKnowledge(searchQuery: string) {
  const query = `
    SELECT id, category, topic, content, created_at
    FROM agent_knowledge
    WHERE topic ILIKE $1 OR content ILIKE $1
    ORDER BY created_at DESC
    LIMIT 5;
  `;
  const res = await pool.query(query, [`%${searchQuery}%`]);
  return {
    resultsFound: res.rowCount,
    knowledge: res.rows,
  };
}

export async function logAuditAction(actionName: string, parameters: any, result: any) {
  try {
    const query = `
      INSERT INTO agent_audit_logs (action_name, parameters, result)
      VALUES ($1, $2, $3);
    `;
    await pool.query(query, [actionName, JSON.stringify(parameters), JSON.stringify(result)]);
  } catch (err: any) {
    console.error("Error al registrar auditoría en PostgreSQL:", err.message);
  }
}

export async function getErrorLogs(limit: number = 5, unresolvedOnly: boolean = false) {
  const whereClause = unresolvedOnly ? "WHERE resolved = FALSE" : "";
  const query = `
    SELECT id, source, error_message, stack_trace, metadata, resolved, occurred_at
    FROM agent_error_logs
    ${whereClause}
    ORDER BY occurred_at DESC
    LIMIT $1;
  `;
  const res = await pool.query(query, [limit]);
  return {
    count: res.rowCount,
    errors: res.rows,
  };
}
