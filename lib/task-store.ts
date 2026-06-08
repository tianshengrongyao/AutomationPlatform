import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ArkTaskResponse, CreateGenerationRequest, StoredTask, TaskStatus } from "./types";
import { getArkModelId } from "./config";

const DATA_DIR = path.join(process.cwd(), "data");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readTasksUnsafe(): Promise<StoredTask[]> {
  try {
    const raw = await readFile(TASKS_FILE, "utf8");
    return JSON.parse(raw) as StoredTask[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeTasks(tasks: StoredTask[]) {
  await ensureStore();
  await writeFile(TASKS_FILE, `${JSON.stringify(tasks, null, 2)}\n`, "utf8");
}

export async function listTasks() {
  const tasks = await readTasksUnsafe();
  return tasks.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getStoredTask(taskId: string) {
  const tasks = await readTasksUnsafe();
  return tasks.find((task) => task.id === taskId);
}

export async function addTask(taskId: string, request: CreateGenerationRequest, response: ArkTaskResponse) {
  const now = new Date().toISOString();
  const initialStatus: TaskStatus = response.status && response.status !== "unknown" ? response.status : "queued";
  const task: StoredTask = {
    id: taskId,
    prompt: request.prompt,
    model: response.model || getArkModelId(),
    status: initialStatus,
    createdAt: now,
    updatedAt: now,
    request,
    response: { ...response, status: initialStatus }
  };
  const tasks = await readTasksUnsafe();
  tasks.unshift(task);
  await writeTasks(tasks);
  return task;
}

export async function updateTask(taskId: string, response: ArkTaskResponse) {
  const tasks = await readTasksUnsafe();
  const now = new Date().toISOString();
  const nextStatus: TaskStatus = response.status || "unknown";
  const nextTasks = tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          status: nextStatus,
          updatedAt: now,
          response,
          error: response.error ? JSON.stringify(response.error) : undefined
        }
      : task
  );
  await writeTasks(nextTasks);
  return nextTasks.find((task) => task.id === taskId);
}

export async function deleteTask(taskId: string) {
  const tasks = await readTasksUnsafe();
  const nextTasks = tasks.filter((task) => task.id !== taskId);
  if (nextTasks.length === tasks.length) return false;
  await writeTasks(nextTasks);
  return true;
}
