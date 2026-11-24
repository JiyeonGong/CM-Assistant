import { useEffect, useState } from 'react';
import type { TodoItem, UpdateTodoInput } from '../types/todo';
import type { CreateTodoInput } from '../types/todo';
import { getKoreanDateText, isCompletedToday, isTodoForToday, TODO_STATUS_LABELS } from '../lib/todo';

interface DashboardPageProps {
  todos: TodoItem[];
  onCreateTodo: (input: CreateTodoInput) => Promise<void>;
  onUpdateTodo: (id: string, input: Omit<UpdateTodoInput, 'id'>) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
}

export default function DashboardPage({ todos, onCreateTodo, onUpdateTodo, onDeleteTodo }: DashboardPageProps) {
  const [quickTitle, setQuickTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [savedMemo, setSavedMemo] = useState('');
  const [memoNotice, setMemoNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const todayTodos = todos.filter((todo) => isTodoForToday(todo));
  const completedToday = todos.filter((todo) => isCompletedToday(todo));
  const activeTodo = todayTodos.find((todo) => todo.status === 'in_progress');
  const nextTodo = activeTodo ?? todayTodos[0];

  useEffect(() => {
    void loadMemo();
  }, []);

  async function loadMemo(): Promise<void> {
    try {
      const storedMemo = await window.cmAssistant.getMemo();
      setMemo(storedMemo);
      setSavedMemo(storedMemo);
    } catch (error) {
      setMemoNotice({ text: error instanceof Error ? error.message : '메모를 불러오지 못했습니다.', type: 'error' });
    }
  }

  async function handleSaveMemo(): Promise<void> {
    setIsSavingMemo(true);
    setMemoNotice(null);
    try {
      const storedMemo = await window.cmAssistant.saveMemo(memo);
      setSavedMemo(storedMemo);
      setMemoNotice({ text: '저장됨', type: 'success' });
    } catch (error) {
      setMemoNotice({ text: error instanceof Error ? error.message : '메모를 저장하지 못했습니다.', type: 'error' });
    } finally {
      setIsSavingMemo(false);
    }
  }

  async function handleQuickAdd(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!quickTitle.trim()) {
      return;
    }

    await onCreateTodo({
      title: quickTitle,
      priority: 'medium',
      dueDate: getTodayInputValue()
    });
    setQuickTitle('');
  }

  return (
    <>
      <section className="hero-card dashboard-hero">
        <div className="hero-main-copy">
          <p className="eyebrow">Today</p>
          <p className="hero-intent">다음으로 할 일</p>
          <h1>{nextTodo ? nextTodo.title : '오늘 업무가 정리됐어요'}</h1>
          <p className="hero-copy">{nextTodo ? `${formatTodoMeta(nextTodo)} · ${getKoreanDateText()}` : getKoreanDateText()}</p>
        </div>
        <div className="hero-side-panel">
          <span>오늘 진행</span>
          <strong>할 일 {todayTodos.length}개</strong>
          <small>완료 {completedToday.length}개</small>
        </div>
      </section>

      <section className="panel quick-add-panel quiet-panel">
        <form className="quick-add-form" onSubmit={handleQuickAdd}>
          <input className="text-input line-input" value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="생각난 업무를 적어두세요 (Enter를 누르면 바로 추가)" />
          <button type="submit" className="accent-button">추가</button>
        </form>
      </section>

      <section className="dashboard-grid">
        <div className="panel focus-panel">
          <div className="section-heading">
            <p className="eyebrow">Today</p>
            <h2>오늘 할 일</h2>
            <p>오늘 처리할 업무를 한곳에서 확인합니다.</p>
          </div>
          <TodoPreviewList todos={todayTodos} emptyText="오늘 할 일이 없습니다." mode="today" scrollable onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />
        </div>

        <div className="panel">
          <div className="section-heading">
            <p className="eyebrow">Done</p>
            <h2>오늘 완료</h2>
            <p>오늘 체크한 업무 기록입니다.</p>
          </div>
          <TodoPreviewList todos={completedToday} emptyText="오늘 완료한 업무가 없습니다." mode="readonly" scrollable onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />
        </div>

        <div className="panel dashboard-wide-panel">
          <div className="section-heading">
            <p className="eyebrow">Memo</p>
            <h2>간단 메모</h2>
            <p>업무 중 기억할 내용을 자유롭게 적어두세요.</p>
          </div>
          <textarea
            className="memo-textarea"
            value={memo}
            onChange={(event) => {
              setMemo(event.target.value);
              setMemoNotice(null);
            }}
            placeholder="메모를 입력하세요."
          />
          <div className="memo-actions">
            <span className={memoNotice?.type === 'error' ? 'memo-status error' : 'memo-status'} role="status">
              {memoNotice?.text ?? ''}
            </span>
            <button type="button" className="primary-button" onClick={() => void handleSaveMemo()} disabled={isSavingMemo || memo === savedMemo}>
              {isSavingMemo ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

type TodoPreviewMode = 'today' | 'readonly';

interface TodoPreviewActions {
  onUpdateTodo: (id: string, input: Omit<UpdateTodoInput, 'id'>) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
}

function TodoPreviewList({ todos, emptyText, mode, scrollable = false, onUpdateTodo, onDeleteTodo }: { todos: TodoItem[]; emptyText: string; mode: TodoPreviewMode; scrollable?: boolean } & TodoPreviewActions) {
  if (todos.length === 0) {
    return <div className="empty-state small">{emptyText}</div>;
  }

  return (
    <div className={`todo-preview-list${scrollable ? ' dashboard-scroll-list' : ''}`}>
      {todos.map((todo) => <TodoPreviewItem todo={todo} mode={mode} onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} key={todo.id} />)}
    </div>
  );
}

function TodoPreviewItem({ todo, mode, onUpdateTodo, onDeleteTodo }: { todo: TodoItem; mode: TodoPreviewMode } & TodoPreviewActions) {
  return (
    <div className="todo-preview-item">
      <div className="todo-preview-content">
        <strong>{todo.title}</strong>
        <span>{formatTodoMeta(todo)}</span>
      </div>
      <div className="todo-preview-actions">
        {mode === 'today' && (
          <>
            <label className="todo-progress-toggle">
              <input
                type="checkbox"
                checked={todo.status === 'in_progress'}
                onChange={(event) => onUpdateTodo(todo.id, { status: event.target.checked ? 'in_progress' : 'todo' })}
              />
              <span>진행 중</span>
            </label>
            <button type="button" className="mini-button" onClick={() => onUpdateTodo(todo.id, { status: 'done' })}>완료</button>
            <button type="button" className="icon-button" aria-label={`${todo.title} 삭제`} onClick={() => onDeleteTodo(todo.id)}>×</button>
          </>
        )}
      </div>
    </div>
  );
}

function getPriorityLabel(priority: TodoItem['priority']): string {
  return priority === 'high' ? '높음' : priority === 'medium' ? '보통' : '낮음';
}

function formatTodoMeta(todo: TodoItem): string {
  const parts = [TODO_STATUS_LABELS[todo.status], getPriorityLabel(todo.priority)];

  if (todo.category) {
    parts.push(todo.category);
  }

  return parts.join(' · ');
}

function getTodayInputValue(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
