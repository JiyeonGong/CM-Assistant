import { clipboard, contextBridge, ipcRenderer } from 'electron';
import type { AttendanceSummary } from '../src/types/attendance';
import type { CreateTodoInput, TodoItem, UpdateTodoInput } from '../src/types/todo';

const api = {
  selectExcelFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectExcelFile'),
  analyzeAttendance: (filePath: string, cohortName: string): Promise<AttendanceSummary> =>
    ipcRenderer.invoke('attendance:analyze', filePath, cohortName),
  analyzePastedAttendance: (pastedText: string, cohortName: string): Promise<AttendanceSummary> =>
    ipcRenderer.invoke('attendance:analyzePastedTable', pastedText, cohortName),
  listTodos: (): Promise<TodoItem[]> => ipcRenderer.invoke('todo:list'),
  ensureTodayRoutineTodos: (): Promise<TodoItem[]> => ipcRenderer.invoke('todo:ensureTodayRoutines'),
  listTodosByDate: (date: string): Promise<TodoItem[]> => ipcRenderer.invoke('todo:listByDate', date),
  createTodo: (input: CreateTodoInput): Promise<TodoItem> => ipcRenderer.invoke('todo:create', input),
  updateTodo: (input: UpdateTodoInput): Promise<TodoItem> => ipcRenderer.invoke('todo:update', input),
  deleteTodo: (id: string): Promise<void> => ipcRenderer.invoke('todo:delete', id),
  copyReport: (text: string, html: string): void => clipboard.write({ text, html })
};

contextBridge.exposeInMainWorld('cmAssistant', api);

export type CmAssistantApi = typeof api;
