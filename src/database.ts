/**
 * AuraCore MCP - Database Layer (SQLite via sql.js)
 */
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Database path in user home
const AURACORE_DIR = path.join(os.homedir(), '.auracore');
const DB_PATH = path.join(AURACORE_DIR, 'auracore.db');

// Ensure directory exists
if (!fs.existsSync(AURACORE_DIR)) {
  fs.mkdirSync(AURACORE_DIR, { recursive: true });
}

let db: SqlJsDatabase | null = null;
let dbInitPromise: Promise<SqlJsDatabase> | null = null;

// Initialize database (singleton pattern)
export async function initDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const SQL = await initSqlJs();

    // Load existing database or create new
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'feature',
        status TEXT DEFAULT 'active',
        workspace_path TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS context (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        priority TEXT DEFAULT 'medium',
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        type TEXT,
        depends_on TEXT,
        estimated_time TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS session_memory (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        UNIQUE(session_id, key)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS decision_log (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        decision_type TEXT NOT NULL,
        input_context TEXT,
        decision TEXT NOT NULL,
        confidence REAL,
        reasoning TEXT,
        was_correct INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_context_project ON context(project_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_context_type ON context(type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_session_memory_session ON session_memory(session_id)`);

    saveDatabase();
    return db;
  })();

  return dbInitPromise;
}

// Save database to file
export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Get database instance (throws if not initialized)
export function getDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

// Helper: run query and save
export function runAndSave(sql: string, params?: any[]): void {
  const database = getDb();
  if (params) {
    database.run(sql, params);
  } else {
    database.run(sql);
  }
  saveDatabase();
}

// Helper: get all rows
export function queryAll<T>(sql: string, params?: any[]): T[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  if (params) stmt.bind(params);

  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as T;
    results.push(row);
  }
  stmt.free();
  return results;
}

// Helper: get single row
export function queryOne<T>(sql: string, params?: any[]): T | undefined {
  const results = queryAll<T>(sql, params);
  return results[0];
}

export { DB_PATH, AURACORE_DIR };
