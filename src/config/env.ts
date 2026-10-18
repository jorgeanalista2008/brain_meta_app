import "dotenv/config";

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "brain_meta_db",
  },
};

if (!config.geminiApiKey) {
  console.warn("⚠️  ADVERTENCIA: GEMINI_API_KEY no encontrada en las variables de entorno (.env)");
}
