import { clipboard, contextBridge, ipcRenderer } from 'electron';
import type { AttendanceSummary } from '../src/types/attendance';
import type { SavedQuickMessages } from '../src/types/appData';
import type { CohortProfileSettings, CreateCohortProfileInput } from '../src/types/cohortProfile';
import type { CreateTodoInput, TodoItem, UpdateTodoInput } from '../src/types/todo';

const api = {
  selectExcelFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectExcelFile'),
  analyzeAttendance: (filePath: string, cohortName: string): Promise<AttendanceSummary> =>
    ipcRenderer.invoke('attendance:analyze', filePath, cohortName),
  analyzePastedAttendance: (pastedText: string, cohortName: string): Promise<AttendanceSummary> =>
    ipcRenderer.invoke('attendance:analyzePastedTable', pastedText, cohortName),
  listTodos: (): Promise<TodoItem[]> => ipcRenderer.invoke('todo:list'),
  createTodo: (input: CreateTodoInput): Promise<TodoItem> => ipcRenderer.invoke('todo:create', input),
  updateTodo: (input: UpdateTodoInput): Promise<TodoItem> => ipcRenderer.invoke('todo:update', input),
  deleteTodo: (id: string): Promise<void> => ipcRenderer.invoke('todo:delete', id),
  getCohortProfileSettings: (): Promise<CohortProfileSettings> => ipcRenderer.invoke('cohortProfiles:get'),
  createCohortProfile: (input: CreateCohortProfileInput): Promise<CohortProfileSettings> => ipcRenderer.invoke('cohortProfiles:create', input),
  selectCohortProfile: (id: string): Promise<CohortProfileSettings> => ipcRenderer.invoke('cohortProfiles:select', id),
  deleteCohortProfile: (id: string): Promise<CohortProfileSettings> => ipcRenderer.invoke('cohortProfiles:delete', id),
  getSavedQuickMessages: (): Promise<SavedQuickMessages> => ipcRenderer.invoke('quickMessages:get'),
  saveQuickMessage: (key: keyof SavedQuickMessages, value: string): Promise<SavedQuickMessages> =>
    ipcRenderer.invoke('quickMessages:save', key, value),
  showNotification: (title: string, body: string): Promise<boolean> => ipcRenderer.invoke('notification:show', title, body),
  copyText: (text: string): void => clipboard.writeText(text),
  copyReport: (text: string, html: string): void => clipboard.write({ text, html })
};

contextBridge.exposeInMainWorld('cmAssistant', api);

export type CmAssistantApi = typeof api;
