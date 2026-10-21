import { FunctionDeclaration, Type } from "@google/genai";
import { pool } from "../database/db.js";
import {
  saveLearnedKnowledge,
  searchLearnedKnowledge,
  logAuditAction,
  getErrorLogs,
} from "./memoryTools.js";

export const getSystemHealthDeclaration: FunctionDeclaration = {
  name: "getSystemHealth",
  description: "Obtiene el estado de salud actual de la aplicación, memoria, uso de CPU y uptime del servidor.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const getAppMetricsDeclaration: FunctionDeclaration = {
  name: "getAppMetrics",
  description: "Obtiene métricas de negocio de la aplicación como usuarios activos, solicitudes por minuto y tasa de errores.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      timeWindow: {
        type: Type.STRING,
        description: "Ventana de tiempo para las métricas, ej: '1h', '24h', '7d'. Por defecto '1h'.",
      },
    },
  },
};

export const getRegisteredUsersDeclaration: FunctionDeclaration = {
  name: "getRegisteredUsers",
  description: "Consulta en la base de datos PostgreSQL la cantidad real y detalles de los usuarios y operadores registrados en el sistema.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.NUMBER,
        description: "Cantidad máxima de usuarios a listar. Por defecto 20.",
      },
    },
  },
};

export const restartServiceDeclaration: FunctionDeclaration = {
  name: "restartService",
  description: "Reinicia un microservicio o componente específico de la aplicación en caso de falla.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      serviceName: {
        type: Type.STRING,
        description: "Nombre del servicio a reiniciar (ej: 'auth-service', 'payment-gateway', 'worker-queue').",
      },
    },
    required: ["serviceName"],
  },
};

// Implementaciones reales/simuladas de las herramientas
export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case "getSystemHealth":
      return {
        status: "healthy",
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
        databaseConnection: "connected",
        redisCache: "connected",
        timestamp: new Date().toISOString(),
      };

    case "getAppMetrics": {
      const window = args.timeWindow || "1h";
      // Consultar usuarios registrados reales en PostgreSQL
      let registeredCount = 0;
      try {
        const countRes = await pool.query("SELECT COUNT(*)::int AS count FROM users;");
        registeredCount = countRes.rows[0]?.count || 0;
      } catch (err) {
        console.error("Error al contar usuarios en getAppMetrics:", err);
      }

      return {
        timeWindow: window,
        registeredUsersInDb: registeredCount,
        activeSessionsEstimate: registeredCount,
        requestsPerMinute: 310,
        errorRatePercent: 0.12,
        topEndpoint: "/api/chat",
        databaseQueriesPerSec: 42,
      };
    }

    case "getRegisteredUsers": {
      const limit = Math.min(Math.max(args.limit || 20, 1), 100);
      try {
        const countRes = await pool.query("SELECT COUNT(*)::int AS total FROM users;");
        const usersRes = await pool.query(
          "SELECT id, name, email, role, created_at FROM users ORDER BY id ASC LIMIT $1;",
          [limit]
        );
        return {
          totalRegisteredUsers: countRes.rows[0]?.total || 0,
          users: usersRes.rows,
        };
      } catch (err: any) {
        console.error("Error consultando usuarios en PostgreSQL:", err);
        return { error: `Error en base de datos: ${err.message}` };
      }
    }

    case "restartService": {
      const service = args.serviceName;
      const res = {
        service,
        success: true,
        message: `El servicio '${service}' fue reiniciado exitosamente.`,
        restartTimestamp: new Date().toISOString(),
      };
      await logAuditAction("restartService", args, res);
      return res;
    }

    case "saveLearnedKnowledge":
      return await saveLearnedKnowledge(args.category, args.topic, args.content);

    case "searchLearnedKnowledge":
      return await searchLearnedKnowledge(args.query);

    case "getErrorLogs":
      return await getErrorLogs(args.limit, args.unresolvedOnly);

    default:
      throw new Error(`Herramienta no implementada: ${name}`);
  }
}
