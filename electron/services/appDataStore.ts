import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SavedQuickMessages } from '../../src/types/appData';
import type { CreateRoutineTemplateInput, CreateTodoInput, RoutineTemplate, TodoItem, TodoPriority, TodoStatus, UpdateRoutineTemplateInput, UpdateTodoInput } from '../../src/types/todo';

const DEFAULT_ROUTINE_TODOS: Array<{ title: string; priority: TodoPriority; category: string }> = [
  { title: '오전 출결 확인 및 QR스캔 독려', priority: 'high', category: '출결관리' },
  { title: '오전 출결 현황 공유', priority: 'high', category: '보고' },
  { title: '오후 출결 현황 공유', priority: 'medium', category: '보고' },
  { title: '최종 출결 확인 및 QR스캔 독려', priority: 'high', category: '출결관리' },
  { title: '최종 확정 현황 공유', priority: 'high', category: '보고' }
];

const DEFAULT_ROUTINE_TODO_TITLES = new Set(DEFAULT_ROUTINE_TODOS.map((todo) => todo.title));
const LEGACY_ROUTINE_TODO_TITLES = new Set(['오전 출결 확인', '오전 출결 보고 공유', '오후 출결 확인', '오후 출결 보고 공유', '최종 출결 확인', '최종 확정 출결 공유']);

interface AppData {
  todos: TodoItem[];
  quickMessages: SavedQuickMessages;
  routineTemplates: RoutineTemplate[];
}

const DEFAULT_DATA: AppData = {
  todos: [],
  quickMessages: {},
  routineTemplates: createDefaultRoutineTemplates()
};

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
  const routineTemplates = sortRoutineTemplates(data.routineTemplates);

  const cleanedTodos = data.todos.filter((todo) => {
    if (todo.source !== 'routine' || todo.dueDate !== today) {
      return true;
    }

    if (LEGACY_ROUTINE_TODO_TITLES.has(todo.title) || seenTodayRoutineTitles.has(todo.title)) {
      hasChanges = true;
      return false;
    }

    seenTodayRoutineTitles.add(todo.title);
    return true;
  });

  data.todos = cleanedTodos;

  for (const routine of routineTemplates) {
    if (!routine.enabled || routine.startsOn > today) {
      continue;
    }

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

export async function listRoutineTemplates(): Promise<RoutineTemplate[]> {
  const data = await readData();
  return sortRoutineTemplates(data.routineTemplates);
}

export async function createRoutineTemplate(input: CreateRoutineTemplateInput): Promise<RoutineTemplate> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('루틴 제목을 입력해주세요.');
  }

  const data = await readData();
  const now = new Date().toISOString();
  const template: RoutineTemplate = {
    id: randomUUID(),
    title,
    priority: input.priority ?? 'medium',
    category: cleanOptional(input.category) ?? '내 루틴',
    enabled: true,
    order: getNextRoutineOrder(data.routineTemplates),
    startsOn: getTomorrowString(),
    createdAt: now,
    updatedAt: now
  };

  data.routineTemplates.push(template);
  await writeData(data);
  return template;
}

export async function updateRoutineTemplateEnabled(id: string, enabled: boolean): Promise<RoutineTemplate> {
  return updateRoutineTemplate({ id, enabled });
}

export async function updateRoutineTemplate(input: UpdateRoutineTemplateInput): Promise<RoutineTemplate> {
  const data = await readData();
  const index = data.routineTemplates.findIndex((template) => template.id === input.id);
  if (index === -1) {
    throw new Error('수정할 루틴을 찾지 못했습니다.');
  }

  const title = input.title !== undefined ? input.title.trim() : data.routineTemplates[index].title;
  if (!title) {
    throw new Error('루틴 제목을 입력해주세요.');
  }

  const updated: RoutineTemplate = {
    ...data.routineTemplates[index],
    title,
    enabled: input.enabled ?? data.routineTemplates[index].enabled,
    updatedAt: new Date().toISOString()
  };

  data.routineTemplates[index] = updated;
  await writeData(data);
  return updated;
}

export async function deleteRoutineTemplate(id: string): Promise<void> {
  const data = await readData();
  const nextTemplates = data.routineTemplates.filter((template) => template.id !== id);
  if (nextTemplates.length === data.routineTemplates.length) {
    throw new Error('삭제할 루틴을 찾지 못했습니다.');
  }

  data.routineTemplates = nextTemplates;
  await writeData(data);
}

export async function getSavedQuickMessages(): Promise<SavedQuickMessages> {
  const data = await readData();
  return data.quickMessages;
}

export async function saveQuickMessage(key: keyof SavedQuickMessages, value: string): Promise<SavedQuickMessages> {
  const allowedKeys: Array<keyof SavedQuickMessages> = [
    'morningGreeting',
    'eveningGreeting',
    'instructorAttendanceShare',
    'instructorMorningAttendanceShare',
    'instructorAfternoonAttendanceShare'
  ];

  if (!allowedKeys.includes(key)) {
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
      quickMessages: parsed.quickMessages ?? {},
      routineTemplates: normalizeRoutineTemplates(parsed.routineTemplates)
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

  const defaultRoutineIndex = DEFAULT_ROUTINE_TODOS.findIndex((routine) => routine.title === todo.title);
  return defaultRoutineIndex === -1 ? Number.MAX_SAFE_INTEGER : defaultRoutineIndex;
}

function createDefaultRoutineTemplates(): RoutineTemplate[] {
  const now = new Date().toISOString();
  const today = getTodayString();
  return DEFAULT_ROUTINE_TODOS.map((routine, index) => ({
    id: `default-routine-${index}`,
    title: routine.title,
    priority: routine.priority,
    category: routine.category,
    enabled: true,
    order: index,
    startsOn: today,
    createdAt: now,
    updatedAt: now
  }));
}

function normalizeRoutineTemplates(value: unknown): RoutineTemplate[] {
  if (!Array.isArray(value) || value.length === 0) {
    return createDefaultRoutineTemplates();
  }

  return sortRoutineTemplates(value.map((template, index) => normalizeRoutineTemplate(template as Partial<RoutineTemplate>, index)));
}

function normalizeRoutineTemplate(template: Partial<RoutineTemplate>, index: number): RoutineTemplate {
  const now = new Date().toISOString();
  return {
    id: template.id ?? randomUUID(),
    title: template.title?.trim() || `루틴 ${index + 1}`,
    priority: template.priority ?? 'medium',
    category: cleanOptional(template.category),
    enabled: template.enabled ?? true,
    order: template.order ?? index,
    startsOn: template.startsOn ?? getTodayString(),
    createdAt: template.createdAt ?? now,
    updatedAt: template.updatedAt ?? now
  };
}

function sortRoutineTemplates(templates: RoutineTemplate[]): RoutineTemplate[] {
  return [...templates].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

function getNextRoutineOrder(templates: RoutineTemplate[]): number {
  return templates.reduce((maxOrder, template) => Math.max(maxOrder, template.order), -1) + 1;
}

function normalizeTodo(todo: TodoItem): TodoItem {
  const completedAt = todo.completedAt ?? (todo.status === 'done' ? todo.updatedAt ?? todo.createdAt : undefined);

  return {
    ...todo,
    completedAt,
    source: todo.source ?? 'manual'
  };
}

function getTodayString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTomorrowString(date = new Date()): string {
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getTodayString(tomorrow);
}

function isFileMissingError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
