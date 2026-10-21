import "dotenv/config";

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  jwtSecret: process.env.JWT_SECRET || "brain_meta_app_secret_key_2026_jwt",
  port: Number(process.env.PORT) || 4000,
  meta: {
    verifyToken: process.env.META_VERIFY_TOKEN || "brain_meta_verify_token_secure_2026",
    accessToken: process.env.META_ACCESS_TOKEN || "",
    phoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
    apiVersion: process.env.META_API_VERSION || "v21.0",
  },
  db: {
    connectionString: process.env.DATABASE_URL || "",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "brain_meta_db",
    ssl: process.env.DB_SSL === "true" || !!process.env.DATABASE_URL,
  },
};

if (!config.geminiApiKey) {
  console.warn("⚠️  ADVERTENCIA: GEMINI_API_KEY no encontrada en las variables de entorno (.env)");
}
