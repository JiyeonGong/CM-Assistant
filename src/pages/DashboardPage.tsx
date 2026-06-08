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
  const stats = getTodoStats(todos);
  const activeTodo = todos.find((todo) => todo.status === 'in_progress');

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
      <section className="hero-card compact-hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>오늘의 업무</h1>
          <p className="hero-copy">{getKoreanDateText()}</p>
        </div>
        <button type="button" className="primary-button" onClick={onNavigateTodo}>Todo 관리</button>
      </section>

      <section className="panel quick-add-panel">
        <form className="quick-add-form" onSubmit={handleQuickAdd}>
          <input className="text-input" value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="생각난 업무를 바로 입력하고 Enter" />
          <button type="submit" className="accent-button">빠른 추가</button>
        </form>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="section-heading">
            <p className="eyebrow">Manual</p>
            <h2>오늘 추가 업무</h2>
          </div>
          <TodoPreviewList todos={manualTodos} emptyText="오늘 추가한 업무가 없습니다." mode="manual" onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />
        </div>

        <div className="panel">
          <div className="section-heading">
            <p className="eyebrow">Routine</p>
            <h2>오늘 루틴 업무</h2>
          </div>
          <TodoPreviewList todos={routineTodos} emptyText="오늘 루틴 업무가 없습니다." mode="routine" onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />
        </div>

        <div className="panel">
          <div className="section-heading">
            <p className="eyebrow">Progress</p>
            <h2>진행 중</h2>
          </div>
          {activeTodo ? <TodoPreviewItem todo={activeTodo} mode="active" onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} /> : <div className="empty-state small">진행 중인 업무가 없습니다.</div>}
        </div>

        <div className="panel">
          <div className="section-heading">
            <p className="eyebrow">Done</p>
            <h2>오늘 완료</h2>
          </div>
          <TodoPreviewList todos={completedToday} emptyText="오늘 완료한 업무가 없습니다." mode="readonly" onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />
        </div>

        <div className="panel">
          <div className="section-heading">
            <p className="eyebrow">Stats</p>
            <h2>전체 업무 상태</h2>
          </div>
          <div className="summary-grid two-columns">
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
