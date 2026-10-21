import { pool, initDatabase } from "./db.js";

async function runMigration() {
  console.log("🚀 Ejecutando migración en PostgreSQL...");
  const ok = await initDatabase();
  if (ok) {
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    console.log("✅ Tablas verificadas en PostgreSQL:");
    res.rows.forEach((row) => console.log(`   - ${row.table_name}`));
  }
  await pool.end();
}

runMigration().catch((e) => {
  console.error("❌ Error en migración:", e);
  process.exit(1);
});
