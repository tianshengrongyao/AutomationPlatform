import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";
import type { ArkTaskResponse, CreateGenerationRequest, StoredTask, TaskStatus } from "./types";
import { getArkModelId } from "./config";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "tasks.db");

let db: Database.Database;

function getDb() {
  if (!db) {
    mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_FILE);
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        model TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        request_json TEXT NOT NULL,
        response_json TEXT
      )
    `);
  }
  return db;
}

function rowToTask(row: {
  id: string;
  prompt: string;
  model: string;
  status: string;
  created_at: string;
  updated_at: string;
  request_json: string;
  response_json: string | null;
}): StoredTask {
  return {
    id: row.id,
    prompt: row.prompt,
    model: row.model,
    status: row.status as TaskStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    request: JSON.parse(row.request_json) as CreateGenerationRequest,
    response: row.response_json ? (JSON.parse(row.response_json) as ArkTaskResponse) : undefined
  };
}

export async function listTasks(): Promise<StoredTask[]> {
  const rows = getDb()
    .prepare("SELECT * FROM tasks ORDER BY created_at DESC")
    .all() as Array<{
    id: string;
    prompt: string;
    model: string;
    status: string;
    created_at: string;
    updated_at: string;
    request_json: string;
    response_json: string | null;
  }>;
  return rows.map(rowToTask);
}

export async function getStoredTask(taskId: string): Promise<StoredTask | undefined> {
  const row = getDb()
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(taskId) as {
    id: string;
    prompt: string;
    model: string;
    status: string;
    created_at: string;
    updated_at: string;
    request_json: string;
    response_json: string | null;
  } | undefined;
  return row ? rowToTask(row) : undefined;
}

export async function addTask(
  taskId: string,
  request: CreateGenerationRequest,
  response: ArkTaskResponse
): Promise<StoredTask> {
  const now = new Date().toISOString();
  const initialStatus: TaskStatus =
    response.status && response.status !== "unknown" ? response.status : "queued";

  getDb()
    .prepare(
      `INSERT OR REPLACE INTO tasks (id, prompt, model, status, created_at, updated_at, request_json, response_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      taskId,
      request.prompt,
      response.model || getArkModelId(),
      initialStatus,
      now,
      now,
      JSON.stringify(request),
      JSON.stringify({ ...response, status: initialStatus })
    );

  return (await getStoredTask(taskId))!;
}

export async function updateTask(
  taskId: string,
  response: ArkTaskResponse
): Promise<StoredTask | undefined> {
  const now = new Date().toISOString();
  const nextStatus: TaskStatus = response.status || "unknown";

  getDb()
    .prepare(
      `UPDATE tasks SET status = ?, updated_at = ?, response_json = ? WHERE id = ?`
    )
    .run(nextStatus, now, JSON.stringify(response), taskId);

  return getStoredTask(taskId);
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const result = getDb().prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
  return result.changes > 0;
}
