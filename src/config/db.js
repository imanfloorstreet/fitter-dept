import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.resolve(process.env.DB_PATH || "./data/app.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON"); // SQLite has foreign keys OFF by default

db.exec(`
  CREATE TABLE IF NOT EXISTS fitters (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    business_name TEXT,
    email         TEXT NOT NULL UNIQUE,
    address       TEXT,
    mobile        TEXT,
    status        TEXT NOT NULL DEFAULT 'active',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- One row per unavailable date (YYYY-MM-DD)
  CREATE TABLE IF NOT EXISTS fitter_dates (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    fitter_id        INTEGER NOT NULL REFERENCES fitters(id) ON DELETE CASCADE,
    unavailable_date TEXT NOT NULL,
    UNIQUE (fitter_id, unavailable_date)
  );
  CREATE INDEX IF NOT EXISTS idx_fitter_dates_date ON fitter_dates(unavailable_date);

  CREATE TABLE IF NOT EXISTS jobs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    fitter_id        INTEGER REFERENCES fitters(id) ON DELETE SET NULL,
    cm_name          TEXT NOT NULL,
    cm_email         TEXT,
    fst_sample_order TEXT,
    description      TEXT,
    quote            REAL NOT NULL DEFAULT 0,
    booking_fee      REAL NOT NULL DEFAULT 0,
    days_needed      INTEGER NOT NULL DEFAULT 1,
    confirmed_dates  TEXT,            -- JSON array of YYYY-MM-DD dates
    draft_order_id   TEXT,            -- text: order IDs can be huge or "gid://..." strings
    images           TEXT,            -- JSON array of image references (/uploads/jobs/...)
    status           TEXT NOT NULL DEFAULT 'INITIAL',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_fitter ON jobs(fitter_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

  -- Keep updated_at current on every update, unless the update already set it
  CREATE TRIGGER IF NOT EXISTS trg_fitters_updated_at
  AFTER UPDATE ON fitters FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
  BEGIN
    UPDATE fitters SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS trg_jobs_updated_at
  AFTER UPDATE ON jobs FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
  BEGIN
    UPDATE jobs SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
`);

console.log(`SQLite connected: ${DB_PATH}`);

export default db;