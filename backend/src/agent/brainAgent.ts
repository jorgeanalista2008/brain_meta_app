import { GoogleGenAI } from "@google/genai";
import { config } from "../config/env.js";
import {
  getSystemHealthDeclaration,
  getAppMetricsDeclaration,
  getRegisteredUsersDeclaration,
  restartServiceDeclaration,
  executeTool,
} from "../tools/appControlTools.js";
import {
  saveLearnedKnowledgeDeclaration,
  searchLearnedKnowledgeDeclaration,
  getErrorLogsDeclaration,
} from "../tools/memoryTools.js";

export class BrainAgent {
  private ai: GoogleGenAI;
  private modelName: string;

  constructor(modelName: string = "gemini-3.1-flash-lite") {
    this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    this.modelName = modelName;
  }

  async run(prompt: string): Promise<string> {
    console.log(`🧠 [BrainAgent] Recibida consulta: "${prompt}"`);
    const systemInstruction = `
Eres BrainAgent, la inteligencia central y asistente de operaciones y control de la aplicación.
Tienes acceso a herramientas de telemetría, métricas, acciones operativas y una MEMORIA PERMANENTE en PostgreSQL.

Tus responsabilidades:
1. Inspeccionar la salud del sistema y métricas cuando te lo soliciten o cuando sospeches un problema.
2. Si el usuario te enseña una nueva regla, solución a un problema o procedimiento, USA la herramienta 'saveLearnedKnowledge' para recordarlo siempre.
3. Si te preguntan sobre un problema recurrente o reglas pasadas, USA la herramienta 'searchLearnedKnowledge' para consultar tu memoria en PostgreSQL.
4. Tomar acciones correctivas (como reiniciar servicios) solo si es pertinente y confirmarlo con el usuario.
Responde de forma concisa, profesional y estructurada.
`;

    const chat = this.ai.chats.create({
      model: this.modelName,
      config: {
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              getSystemHealthDeclaration,
              getAppMetricsDeclaration,
              getRegisteredUsersDeclaration,
              restartServiceDeclaration,
              saveLearnedKnowledgeDeclaration,
              searchLearnedKnowledgeDeclaration,
              getErrorLogsDeclaration,
            ],
          },
        ],
      },
    });

    let response = await chat.sendMessage({ message: prompt });

    // Bucle para resolver llamadas a herramientas (Tool / Function Calling)
    while (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        const functionName = call.name || "unknown";
        console.log(`🤖 [BrainAgent] Ejecutando herramienta: ${functionName}(${JSON.stringify(call.args)})`);
        
        try {
          const toolResult = await executeTool(functionName, (call.args as Record<string, any>) || {});
          
          response = await chat.sendMessage({
            message: [
              {
                functionResponse: {
                  name: functionName,
                  response: { result: toolResult },
                },
              },
            ],
          });
        } catch (err: any) {
          response = await chat.sendMessage({
            message: [
              {
                functionResponse: {
                  name: functionName,
                  response: { error: err.message },
                },
              },
            ],
          });
        }
      }
    }

    return response.text || "Operación completada sin texto adicional.";
  }
}
