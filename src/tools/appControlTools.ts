import { FunctionDeclaration, Type } from "@google/genai";
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

    case "getAppMetrics":
      const window = args.timeWindow || "1h";
      return {
        timeWindow: window,
        activeUsers: 1420,
        requestsPerMinute: 310,
        errorRatePercent: 0.12,
        topEndpoint: "/api/v1/feed",
        databaseQueriesPerSec: 85,
      };

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
