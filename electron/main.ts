import { app, BrowserWindow, dialog, ipcMain, Notification, shell } from 'electron';
import { join } from 'node:path';
import { analyzeAttendancePastedTable, analyzeAttendanceWorkbook } from './services/attendanceAnalyzer';
import {
  createRoutineTemplate,
  createTodo,
  deleteRoutineTemplate,
  deleteTodo,
  ensureTodayRoutineTodos,
  getSavedQuickMessages,
  listRoutineTemplates,
  listTodos,
  listTodosByDate,
  saveQuickMessage,
  updateRoutineTemplate,
  updateRoutineTemplateEnabled,
  updateTodo
} from './services/appDataStore';

if (process.platform === 'win32') {
  app.setAppUserModelId('com.cm-assistant.app');
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 860,
    minWidth: 860,
    minHeight: 680,
    title: 'CM Assistant',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      sandbox: false,
      contextIsolation: true
    }
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('dialog:selectExcelFile', async () => {
    const result = await dialog.showOpenDialog({
      title: '출석부 엑셀 파일 선택',
      properties: ['openFile'],
      filters: [{ name: 'Excel files', extensions: ['xlsx', 'xls'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('attendance:analyze', async (_event, filePath: string, cohortName: string) => {
    return analyzeAttendanceWorkbook(filePath, cohortName);
  });

  ipcMain.handle('attendance:analyzePastedTable', async (_event, pastedText: string, cohortName: string) => {
    return analyzeAttendancePastedTable(pastedText, cohortName);
  });

  ipcMain.handle('todo:list', async () => listTodos());
  ipcMain.handle('todo:ensureTodayRoutines', async () => ensureTodayRoutineTodos());
  ipcMain.handle('todo:listByDate', async (_event, date: string) => listTodosByDate(date));
  ipcMain.handle('todo:create', async (_event, input) => createTodo(input));
  ipcMain.handle('todo:update', async (_event, input) => updateTodo(input));
  ipcMain.handle('todo:delete', async (_event, id: string) => deleteTodo(id));
  ipcMain.handle('routineTemplates:list', async () => listRoutineTemplates());
  ipcMain.handle('routineTemplates:create', async (_event, input) => createRoutineTemplate(input));
  ipcMain.handle('routineTemplates:update', async (_event, input) => updateRoutineTemplate(input));
  ipcMain.handle('routineTemplates:updateEnabled', async (_event, id: string, enabled: boolean) => updateRoutineTemplateEnabled(id, enabled));
  ipcMain.handle('routineTemplates:delete', async (_event, id: string) => deleteRoutineTemplate(id));
  ipcMain.handle('quickMessages:get', async () => getSavedQuickMessages());
  ipcMain.handle('quickMessages:save', async (_event, key, value: string) => saveQuickMessage(key, value));
  ipcMain.handle('notification:show', async (_event, title: string, body: string) => {
    if (!Notification.isSupported()) {
      return false;
    }

    shell.beep();
    new Notification({ title, body, silent: false }).show();
    return true;
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
