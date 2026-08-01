// The single SQLite connection, shared by every route.
//
// better-sqlite3 is synchronous on purpose: SQLite is a file on disk, not a
// network service, so there is nothing to await. Reads return immediately and
// the usual async ceremony would only add overhead.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");

// db/ is already covered by .gitignore ("Drill data / local progress").
const DB_DIR = path.join(ROOT, "db");
export const DB_PATH = process.env.SKILLTAPE_DB || path.join(DB_DIR, "skilltape.db");

if (DB_PATH !== ":memory:") fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// WAL lets reads proceed while a write is in flight — worth having the moment
// the editor saves while a quiz is being taken.
db.pragma("journal_mode = WAL");
// SQLite ships with foreign keys OFF for backwards compatibility. Without this
// the REFERENCES clauses in schema.sql are documentation, not constraints.
db.pragma("foreign_keys = ON");

// schema.sql is entirely CREATE ... IF NOT EXISTS, so running it on every boot
// is a no-op once the tables exist. That makes it a create-or-noop migration.
db.exec(fs.readFileSync(path.join(HERE, "schema.sql"), "utf8"));

export default db;
