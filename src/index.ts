import readline from "node:readline";
import { BrainAgent } from "./agent/brainAgent.js";
import { config } from "./config/env.js";
import { startServer } from "./server.js";

async function main() {
  console.log("==================================================");
  console.log("🧠 Brain Meta App - Asistente de Control con Gemini");
  console.log("==================================================");

  if (!config.geminiApiKey) {
    console.error("\n❌ Error: Configura tu variable GEMINI_API_KEY en el archivo .env para interactuar.");
    console.log("Puedes copiar el archivo '.env.example' a '.env' y colocar tu API key.");
    process.exit(1);
  }

  // Iniciar servidor web e interfaz UI
  await startServer();

  const agent = new BrainAgent();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\nEjemplos de comandos que puedes probar:");
  console.log("- \"¿Cómo está la salud del servidor ahora?\"");
  console.log("- \"Muéstrame las métricas de usuarios y solicitudes de las últimas 24h\"");
  console.log("- \"El servicio de auth está fallando, por favor reinícialo\"\n");

  const ask = () => {
    rl.question("\n👤 Tú: ", async (input) => {
      const trimmed = input.trim();
      if (trimmed.toLowerCase() === "salir" || trimmed.toLowerCase() === "exit") {
        console.log("Cerrando sesión de control. ¡Hasta luego!");
        rl.close();
        return;
      }

      if (!trimmed) {
        ask();
        return;
      }

      try {
        const reply = await agent.run(trimmed);
        console.log(`\n🧠 BrainAgent:\n${reply}`);
      } catch (error: any) {
        console.error("\n❌ Error al procesar tu solicitud:", error.message || error);
      }

      ask();
    });
  };

  ask();
}

main();
