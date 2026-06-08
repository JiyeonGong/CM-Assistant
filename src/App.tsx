import { useEffect, useRef, useState } from 'react';
import AttendancePage from './pages/AttendancePage';
import DashboardPage from './pages/DashboardPage';
import TodoPage from './pages/TodoPage';
import { getTodayString } from './lib/todo';
import type { CreateTodoInput, TodoItem, UpdateTodoInput } from './types/todo';

type AppPage = 'dashboard' | 'attendance' | 'todo';

const NAV_ITEMS: Array<{ id: AppPage; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'todo', label: 'Todo' }
];

export default function App() {
  const [activePage, setActivePage] = useState<AppPage>('dashboard');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoError, setTodoError] = useState('');
  const currentDateRef = useRef(getTodayString());

  useEffect(() => {
    void initializeTodos();

    const intervalId = window.setInterval(() => {
      const today = getTodayString();
      if (today === currentDateRef.current) {
        return;
      }

      currentDateRef.current = today;
      void initializeTodos();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  async function initializeTodos(): Promise<void> {
    const nextTodos = await window.cmAssistant.ensureTodayRoutineTodos();
    setTodos(nextTodos);
  }

  async function refreshTodos(): Promise<void> {
    const nextTodos = await window.cmAssistant.listTodos();
    setTodos(nextTodos);
  }

  async function handleCreateTodo(input: CreateTodoInput): Promise<void> {
    setTodoError('');
    try {
      await window.cmAssistant.createTodo(input);
      await refreshTodos();
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : '할 일을 추가하지 못했습니다.');
    }
  }

  async function handleUpdateTodo(id: string, input: Omit<UpdateTodoInput, 'id'>): Promise<void> {
    setTodoError('');
    try {
      await window.cmAssistant.updateTodo({ id, ...input });
      await refreshTodos();
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : '할 일을 수정하지 못했습니다.');
    }
  }

  async function handleDeleteTodo(id: string): Promise<void> {
    setTodoError('');
    await window.cmAssistant.deleteTodo(id);
    await refreshTodos();
  }

  return (
    <main className="app-shell">
      <nav className="app-nav">
        <div>
          <strong>CM Assistant</strong>
          <span>Local workflow tool</span>
        </div>
        <div className="nav-button-group">
          {NAV_ITEMS.map((item) => (
            <button type="button" className={activePage === item.id ? 'nav-button active' : 'nav-button'} onClick={() => setActivePage(item.id)} key={item.id}>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {todoError && <p className="status-message error app-level-message">{todoError}</p>}

      {activePage === 'dashboard' && (
        <DashboardPage
          todos={todos}
          onCreateTodo={handleCreateTodo}
          onUpdateTodo={handleUpdateTodo}
          onDeleteTodo={handleDeleteTodo}
          onNavigateTodo={() => setActivePage('todo')}
        />
      )}
      {activePage === 'attendance' && <AttendancePage />}
      {activePage === 'todo' && <TodoPage todos={todos} onCreateTodo={handleCreateTodo} onUpdateTodo={handleUpdateTodo} onDeleteTodo={handleDeleteTodo} />}
    </main>
  );
}
