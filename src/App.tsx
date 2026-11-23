import { useEffect, useRef, useState } from 'react';
import CohortProfilePicker from './components/CohortProfilePicker';
import AttendancePage from './pages/AttendancePage';
import DashboardPage from './pages/DashboardPage';
import QuickMessagesPage from './pages/QuickMessagesPage';
import { getTodayString } from './lib/todo';
import type { CohortProfileSettings, CreateCohortProfileInput } from './types/cohortProfile';
import type { CreateTodoInput, TodoItem, UpdateTodoInput } from './types/todo';

type AppPage = 'dashboard' | 'attendance' | 'quickMessages';

const NAV_ITEMS: Array<{ id: AppPage; label: string }> = [
  { id: 'attendance', label: '출결' },
  { id: 'dashboard', label: '오늘' },
  { id: 'quickMessages', label: '업무' }
];

export default function App() {
  const [activePage, setActivePage] = useState<AppPage>('attendance');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoError, setTodoError] = useState('');
  const [cohortProfileSettings, setCohortProfileSettings] = useState<CohortProfileSettings | null>(null);
  const [cohortProfileError, setCohortProfileError] = useState('');
  const [isCohortProfileBusy, setIsCohortProfileBusy] = useState(false);
  const currentDateRef = useRef(getTodayString());
  const activeCohortProfile = cohortProfileSettings?.profiles.find((profile) => profile.id === cohortProfileSettings.activeProfileId);

  useEffect(() => {
    void initializeTodos();
    void initializeCohortProfiles();

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
    const nextTodos = await window.cmAssistant.listTodos();
    setTodos(nextTodos);
  }

  async function refreshTodos(): Promise<void> {
    const nextTodos = await window.cmAssistant.listTodos();
    setTodos(nextTodos);
  }

  async function initializeCohortProfiles(): Promise<void> {
    setIsCohortProfileBusy(true);
    setCohortProfileError('');
    try {
      setCohortProfileSettings(await window.cmAssistant.getCohortProfileSettings());
    } catch (error) {
      setCohortProfileError(error instanceof Error ? error.message : '과정·기수를 불러오지 못했습니다.');
    } finally {
      setIsCohortProfileBusy(false);
    }
  }

  async function handleCreateCohortProfile(input: CreateCohortProfileInput): Promise<boolean> {
    if (isCohortProfileBusy) return false;
    setIsCohortProfileBusy(true);
    setCohortProfileError('');
    try {
      setCohortProfileSettings(await window.cmAssistant.createCohortProfile(input));
      return true;
    } catch (error) {
      setCohortProfileError(error instanceof Error ? error.message : '과정·기수를 추가하지 못했습니다.');
      return false;
    } finally {
      setIsCohortProfileBusy(false);
    }
  }

  async function handleSelectCohortProfile(id: string): Promise<boolean> {
    if (isCohortProfileBusy) return false;
    if (id === cohortProfileSettings?.activeProfileId) {
      return true;
    }

    setIsCohortProfileBusy(true);
    setCohortProfileError('');
    try {
      setCohortProfileSettings(await window.cmAssistant.selectCohortProfile(id));
      return true;
    } catch (error) {
      setCohortProfileError(error instanceof Error ? error.message : '과정·기수를 선택하지 못했습니다.');
      return false;
    } finally {
      setIsCohortProfileBusy(false);
    }
  }

  async function handleDeleteCohortProfile(id: string): Promise<boolean> {
    if (isCohortProfileBusy) return false;
    setIsCohortProfileBusy(true);
    setCohortProfileError('');
    try {
      setCohortProfileSettings(await window.cmAssistant.deleteCohortProfile(id));
      return true;
    } catch (error) {
      setCohortProfileError(error instanceof Error ? error.message : '과정·기수를 삭제하지 못했습니다.');
      return false;
    } finally {
      setIsCohortProfileBusy(false);
    }
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
          <div className="app-brand-row">
            <strong>CM Assistant</strong>
            <button type="button" className="app-info-button" aria-label="앱 제작자 및 문의 정보">
              ?
              <span className="app-info-tooltip" role="tooltip">
                Made by Jiyeon Gong<br />문의: jeeye0704@gmail.com
              </span>
            </button>
          </div>
          <span>Class manager workspace</span>
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

      {(activePage === 'attendance' || activePage === 'quickMessages') && (
        <CohortProfilePicker
          settings={cohortProfileSettings}
          error={cohortProfileError}
          isBusy={isCohortProfileBusy}
          onCreate={handleCreateCohortProfile}
          onSelect={handleSelectCohortProfile}
          onDelete={handleDeleteCohortProfile}
          onRetry={initializeCohortProfiles}
        />
      )}

      {activePage === 'dashboard' && (
        <DashboardPage
          todos={todos}
          onCreateTodo={handleCreateTodo}
          onUpdateTodo={handleUpdateTodo}
          onDeleteTodo={handleDeleteTodo}
        />
      )}
      {activePage === 'attendance' && activeCohortProfile && <AttendancePage activeCohortProfile={activeCohortProfile} />}
      {activePage === 'quickMessages' && activeCohortProfile && <QuickMessagesPage activeCohortProfile={activeCohortProfile} />}
    </main>
  );
}
