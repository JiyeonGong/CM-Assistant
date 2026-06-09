import { useState } from 'react';
import type { TodoItem, UpdateTodoInput } from '../types/todo';
import type { CreateTodoInput } from '../types/todo';
import { getKoreanDateText, getTodoStats, isCompletedToday, isTodoForToday, TODO_STATUS_LABELS } from '../lib/todo';

interface DashboardPageProps {
  todos: TodoItem[];
  onCreateTodo: (input: CreateTodoInput) => Promise<void>;
  onUpdateTodo: (id: string, input: Omit<UpdateTodoInput, 'id'>) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
  onNavigateTodo: () => void;
}

export default function DashboardPage({ todos, onCreateTodo, onUpdateTodo, onDeleteTodo, onNavigateTodo }: DashboardPageProps) {
  const [quickTitle, setQuickTitle] = useState('');
  const todayTodos = todos.filter((todo) => isTodoForToday(todo));
  const routineTodos = todayTodos.filter((todo) => todo.source === 'routine' && todo.status !== 'done');
  const manualTodos = todayTodos.filter((todo) => todo.source === 'manual' && todo.status !== 'done');
  const completedToday = todos.filter((todo) => isCompletedToday(todo));
  const todayRoutineTodos = todos.filter((todo) => todo.source === 'routine' && todo.dueDate === getTodayInputValue());
  const routineTotal = todayRoutineTodos.length;
  const routineDone = todayRoutineTodos.filter((todo) => todo.status === 'done').length;
  const stats = getTodoStats(todos);
  const activeTodo = todos.find((todo) => todo.status === 'in_progress');
  const nextTodo = activeTodo ?? routineTodos[0] ?? manualTodos[0];

  async function handleQuickAdd(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!quickTitle.trim()) {
      return;
    }

    await onCreateTodo({
      title: quickTitle,
      priority: 'medium',
      dueDate: getTodayInputValue(),
      source: 'manual'
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
          <strong>루틴 {routineDone}/{routineTotal || 5}</strong>
          <small>추가 {manualTodos.length}개</small>
          <button type="button" className="secondary-button light-button" onClick={onNavigateTodo}>전체 업무 보기</button>
        </div>
      </section>

      <section className="panel quick-add-panel quiet-panel">
        <form className="quick-add-form" onSubmit={handleQuickAdd}>
          <input className="text-input line-input" value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="생각난 업무를 적어두세요" />
          <button type="submit" className="accent-button">추가</button>
        </form>
      </section>

      <section className="dashboard-grid">
        <div className="panel focus-panel">
          <div className="section-heading">
            <p className="eyebrow">Routine</p>
            <h2>오늘 루틴</h2>
            <p>순서대로 확인하면 오늘 출결 운영이 정리됩니다.</p>
          </div>
          <TodoPreviewList todos={routineTodos} emptyText="남은 루틴이 없습니다." mode="routine" onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />
        </div>

        <div className="panel">
          <div className="section-heading">
            <p className="eyebrow">Added</p>
            <h2>추가 업무</h2>
            <p>오늘 처리할 비정기 업무만 모아봅니다.</p>
          </div>
          <TodoPreviewList todos={manualTodos} emptyText="추가 업무가 없습니다." mode="manual" onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />
        </div>

        <div className="panel">
          <div className="section-heading">
            <p className="eyebrow">Progress</p>
            <h2>진행 중</h2>
            <p>지금 집중할 업무입니다.</p>
          </div>
          {activeTodo ? <TodoPreviewItem todo={activeTodo} mode="active" onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} /> : <div className="empty-state small">진행 중인 업무가 없습니다.</div>}
        </div>

        <div className="panel">
          <div className="section-heading">
            <p className="eyebrow">Done</p>
            <h2>오늘 완료</h2>
            <p>오늘 체크한 업무 기록입니다.</p>
          </div>
          <TodoPreviewList todos={completedToday} emptyText="오늘 완료한 업무가 없습니다." mode="readonly" onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />
        </div>

        <div className="panel dashboard-wide-panel">
          <div className="section-heading">
            <p className="eyebrow">Stats</p>
            <h2>전체 상태</h2>
          </div>
          <div className="summary-grid five-columns">
            <StatItem label="전체" value={`${stats.total}개`} />
            <StatItem label="진행 전" value={`${stats.todo}개`} />
            <StatItem label="진행 중" value={`${stats.inProgress}개`} />
            <StatItem label="완료" value={`${stats.done}개`} />
            <StatItem label="보류" value={`${stats.hold}개`} />
          </div>
        </div>
      </section>
    </>
  );
}

type TodoPreviewMode = 'manual' | 'routine' | 'active' | 'readonly';

interface TodoPreviewActions {
  onUpdateTodo: (id: string, input: Omit<UpdateTodoInput, 'id'>) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
}

function TodoPreviewList({ todos, emptyText, mode, onUpdateTodo, onDeleteTodo }: { todos: TodoItem[]; emptyText: string; mode: TodoPreviewMode } & TodoPreviewActions) {
  if (todos.length === 0) {
    return <div className="empty-state small">{emptyText}</div>;
  }

  return (
    <div className="todo-preview-list">
      {todos.map((todo) => <TodoPreviewItem todo={todo} mode={mode} onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} key={todo.id} />)}
    </div>
  );
}

function TodoPreviewItem({ todo, mode, onUpdateTodo, onDeleteTodo }: { todo: TodoItem; mode: TodoPreviewMode } & TodoPreviewActions) {
  return (
    <div className="todo-preview-item">
      {mode === 'routine' && (
        <input
          className="todo-check"
          type="checkbox"
          aria-label={`${todo.title} 완료`}
          checked={todo.status === 'done'}
          onChange={(event) => onUpdateTodo(todo.id, { status: event.target.checked ? 'done' : 'todo' })}
        />
      )}
      <div className="todo-preview-content">
        <strong>{todo.title}</strong>
        <span>{formatTodoMeta(todo)}</span>
      </div>
      <div className="todo-preview-actions">
        {mode !== 'readonly' && mode !== 'active' && (
          <button type="button" className="mini-button" onClick={() => onUpdateTodo(todo.id, { status: 'in_progress' })}>진행</button>
        )}
        {mode === 'active' && <button type="button" className="mini-button" onClick={() => onUpdateTodo(todo.id, { status: 'done' })}>완료</button>}
        {mode === 'manual' && <button type="button" className="icon-button" aria-label={`${todo.title} 삭제`} onClick={() => onDeleteTodo(todo.id)}>×</button>}
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getPriorityLabel(priority: TodoItem['priority']): string {
  return priority === 'high' ? '높음' : priority === 'medium' ? '보통' : '낮음';
}

function formatTodoMeta(todo: TodoItem): string {
  const parts = [TODO_STATUS_LABELS[todo.status]];

  if (todo.source === 'manual') {
    parts.push(getPriorityLabel(todo.priority));
  }

  if (todo.category) {
    parts.push(todo.category);
  }

  return parts.join(' · ');
}

function getTodayInputValue(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
