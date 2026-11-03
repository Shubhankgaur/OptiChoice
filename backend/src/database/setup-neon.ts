import pg from "pg";
import { config } from "dotenv";
import { resolve } from "node:path";

// Load .env
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../.env") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ ERROR: DATABASE_URL is not set.");
  console.error("Please add your Neon PostgreSQL connection string to backend/.env:");
  console.error("DATABASE_URL=postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require\n");
  process.exit(1);
}

console.log("🔌 Connecting to Neon PostgreSQL...");

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email_verified_at TEXT,
    date_of_birth TEXT,
    gender TEXT,
    phone_number TEXT,
    location TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);

  CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS email_verification_tokens_user_id_idx ON email_verification_tokens(user_id);

  CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    alternatives_json TEXT NOT NULL,
    criteria_json TEXT NOT NULL,
    ratings_json TEXT NOT NULL,
    ranking_json TEXT NOT NULL,
    breakdown_json TEXT NOT NULL,
    scoring_mode TEXT NOT NULL DEFAULT 'rating',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS decisions_created_at_idx ON decisions(created_at DESC);
  CREATE INDEX IF NOT EXISTS decisions_user_id_idx ON decisions(user_id);

  CREATE TABLE IF NOT EXISTS decision_drafts (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    draft_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS decision_drafts_updated_at_idx ON decision_drafts(updated_at DESC);
  CREATE INDEX IF NOT EXISTS decision_drafts_user_id_idx ON decision_drafts(user_id);
`;

async function main() {
  try {
    const client = await pool.connect();
    console.log(" Connected to Neon successfully!");

    console.log("📦 Creating tables and indexes in Neon...");
    await client.query(schema);
    console.log("✅ All tables created successfully:");
    console.log("   - users");
    console.log("   - user_sessions");
    console.log("   - password_reset_tokens");
    console.log("   - email_verification_tokens");
    console.log("   - decisions");
    console.log("   - decision_drafts");

    client.release();
    await pool.end();
    console.log("\n🎉 Neon database is fully initialized and ready for production deployment!");
  } catch (err) {
    console.error("❌ Failed to initialize Neon database:", err);
    process.exit(1);
  }
}

main();

