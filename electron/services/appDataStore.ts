import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SavedQuickMessages } from '../../src/types/appData';
import type { CreateTodoInput, TodoItem, TodoPriority, TodoStatus, UpdateTodoInput } from '../../src/types/todo';

interface AppData {
  todos: TodoItem[];
  quickMessages: SavedQuickMessages;
}

const DEFAULT_DATA: AppData = {
  todos: [],
  quickMessages: {}
};

const DAILY_ROUTINE_TODOS: Array<{ title: string; priority: TodoPriority; category: string }> = [
  { title: '오전 출결 확인 및 QR스캔 독려', priority: 'high', category: '출결관리' },
  { title: '오전 출결 현황 공유', priority: 'high', category: '보고' },
  { title: '오후 출결 현황 공유', priority: 'medium', category: '보고' },
  { title: '최종 출결 확인 및 QR스캔 독려', priority: 'high', category: '출결관리' },
  { title: '최종 확정 현황 공유', priority: 'high', category: '보고' }
];

const DAILY_ROUTINE_TODO_TITLES = new Set(DAILY_ROUTINE_TODOS.map((todo) => todo.title));
const DAILY_ROUTINE_TODO_ORDER = new Map(DAILY_ROUTINE_TODOS.map((todo, index) => [todo.title, index]));

function getDataFilePath(): string {
  return join(app.getPath('userData'), 'cm-assistant-data.json');
}

export async function listTodos(): Promise<TodoItem[]> {
  const data = await readData();
  return sortTodos(data.todos);
}

export async function listTodosByDate(date: string): Promise<TodoItem[]> {
  const todos = await listTodos();
  return todos.filter((todo) => {
    if (todo.status === 'done') return false;
    if (todo.source === 'routine') return todo.dueDate === date;
    return !todo.dueDate || todo.dueDate <= date;
  });
}

export async function ensureTodayRoutineTodos(): Promise<TodoItem[]> {
  const data = await readData();
  const today = getTodayString();
  const now = new Date().toISOString();
  let hasChanges = false;
  const seenTodayRoutineTitles = new Set<string>();

  const cleanedTodos = data.todos.filter((todo) => {
    if (todo.source !== 'routine' || todo.dueDate !== today) {
      return true;
    }

    if (!DAILY_ROUTINE_TODO_TITLES.has(todo.title) || seenTodayRoutineTitles.has(todo.title)) {
      hasChanges = true;
      return false;
    }

    seenTodayRoutineTitles.add(todo.title);
    return true;
  });

  data.todos = cleanedTodos;

  for (const routine of DAILY_ROUTINE_TODOS) {
    const exists = data.todos.some((todo) => todo.source === 'routine' && todo.dueDate === today && todo.title === routine.title);
    if (exists) {
      continue;
    }

    data.todos.push({
      id: randomUUID(),
      title: routine.title,
      status: 'todo',
      priority: routine.priority,
      category: routine.category,
      dueDate: today,
      source: 'routine',
      createdAt: now,
      updatedAt: now
    });
    hasChanges = true;
  }

  if (hasChanges) {
    await writeData(data);
  }

  return sortTodos(data.todos);
}

export async function createTodo(input: CreateTodoInput): Promise<TodoItem> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('할 일 제목을 입력해주세요.');
  }

  const data = await readData();
  const now = new Date().toISOString();
  const todo: TodoItem = {
    id: randomUUID(),
    title,
    description: cleanOptional(input.description),
    status: 'todo',
    priority: input.priority,
    category: cleanOptional(input.category),
    dueDate: cleanOptional(input.dueDate),
    source: input.source ?? 'manual',
    createdAt: now,
    updatedAt: now
  };

  data.todos.push(todo);
  await writeData(data);
  return todo;
}

export async function updateTodo(input: UpdateTodoInput): Promise<TodoItem> {
  const data = await readData();
  const index = data.todos.findIndex((todo) => todo.id === input.id);
  if (index === -1) {
    throw new Error('수정할 할 일을 찾지 못했습니다.');
  }

  const existing = data.todos[index];
  const nextStatus = input.status ?? existing.status;
  const updated: TodoItem = {
    ...existing,
    ...input,
    title: input.title !== undefined ? input.title.trim() : existing.title,
    description: input.description !== undefined ? cleanOptional(input.description) : existing.description,
    category: input.category !== undefined ? cleanOptional(input.category) : existing.category,
    dueDate: input.dueDate !== undefined ? cleanOptional(input.dueDate) : existing.dueDate,
    status: nextStatus,
    completedAt: resolveCompletedAt(existing.status, nextStatus, existing.completedAt),
    updatedAt: new Date().toISOString()
  };

  if (!updated.title) {
    throw new Error('할 일 제목을 입력해주세요.');
  }

  data.todos[index] = updated;
  await writeData(data);
  return updated;
}

export async function deleteTodo(id: string): Promise<void> {
  const data = await readData();
  data.todos = data.todos.filter((todo) => todo.id !== id);
  await writeData(data);
}

export async function getSavedQuickMessages(): Promise<SavedQuickMessages> {
  const data = await readData();
  return data.quickMessages;
}

export async function saveQuickMessage(key: keyof SavedQuickMessages, value: string): Promise<SavedQuickMessages> {
  if (key !== 'morningGreeting' && key !== 'eveningGreeting' && key !== 'instructorAttendanceShare') {
    throw new Error('저장할 수 없는 멘트 종류입니다.');
  }

  const data = await readData();
  data.quickMessages = {
    ...data.quickMessages,
    [key]: value
  };
  await writeData(data);
  return data.quickMessages;
}

async function readData(): Promise<AppData> {
  const filePath = getDataFilePath();

  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      todos: Array.isArray(parsed.todos) ? parsed.todos.map(normalizeTodo) : [],
      quickMessages: parsed.quickMessages ?? {}
    };
  } catch (error) {
    if (isFileMissingError(error)) {
      await writeData(DEFAULT_DATA);
      return { ...DEFAULT_DATA };
    }

    throw error;
  }
}

async function writeData(data: AppData): Promise<void> {
  const filePath = getDataFilePath();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function resolveCompletedAt(previousStatus: TodoStatus, nextStatus: TodoStatus, existingCompletedAt?: string): string | undefined {
  if (nextStatus === 'done' && previousStatus !== 'done') {
    return new Date().toISOString();
  }

  if (nextStatus !== 'done') {
    return undefined;
  }

  return existingCompletedAt;
}

function cleanOptional(value?: string): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function sortTodos(todos: TodoItem[]): TodoItem[] {
  const statusOrder: Record<TodoStatus, number> = {
    in_progress: 0,
    todo: 1,
    hold: 2,
    done: 3
  };
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  return [...todos].sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    const dueDateDiff = (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
    if (dueDateDiff !== 0) return dueDateDiff;

    const routineOrderDiff = getRoutineOrder(a) - getRoutineOrder(b);
    if (routineOrderDiff !== 0) return routineOrderDiff;

    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return a.createdAt.localeCompare(b.createdAt);
  });
}

function getRoutineOrder(todo: TodoItem): number {
  if (todo.source !== 'routine') {
    return Number.MAX_SAFE_INTEGER;
  }

  return DAILY_ROUTINE_TODO_ORDER.get(todo.title) ?? Number.MAX_SAFE_INTEGER;
}

function normalizeTodo(todo: TodoItem): TodoItem {
  return {
    ...todo,
    source: todo.source ?? 'manual'
  };
}

function getTodayString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isFileMissingError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
