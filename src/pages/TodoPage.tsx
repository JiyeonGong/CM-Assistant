import { useState } from 'react';
import { getTodayString, TODO_STATUS_LABELS } from '../lib/todo';
import type { CreateTodoInput, TodoItem, TodoPriority, TodoStatus } from '../types/todo';

interface TodoPageProps {
  todos: TodoItem[];
  onCreateTodo: (input: CreateTodoInput) => Promise<void>;
  onUpdateTodo: (id: string, input: Partial<Pick<TodoItem, 'status' | 'priority' | 'title' | 'category' | 'dueDate' | 'description'>>) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
}

const STATUS_ORDER: TodoStatus[] = ['todo', 'in_progress', 'done', 'hold'];

export default function TodoPage({ todos, onCreateTodo, onUpdateTodo, onDeleteTodo }: TodoPageProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState(getTodayString());
  const [description, setDescription] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await onCreateTodo({ title, priority, category, dueDate, description });
    setTitle('');
    setCategory('');
    setDescription('');
  }

  return (
    <>
      <section className="hero-card compact-hero">
        <div>
          <p className="eyebrow">Todo</p>
          <h1>업무 관리</h1>
          <p className="hero-copy">오늘 해야 할 업무를 빠르게 등록하고 상태를 관리합니다.</p>
        </div>
      </section>

      <section className="panel">
        <form className="todo-form" onSubmit={handleSubmit}>
          <input className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="새 할 일 입력" />
          <select className="text-input" value={priority} onChange={(event) => setPriority(event.target.value as TodoPriority)}>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
          <input className="text-input" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="카테고리" />
          <input className="text-input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <input className="text-input todo-description-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="메모" />
          <button type="submit" className="accent-button">추가</button>
        </form>
      </section>

      <section className="todo-board">
        {STATUS_ORDER.map((status) => (
          <div className="panel todo-column" key={status}>
            <div className="section-heading">
              <p className="eyebrow">{status}</p>
              <h2>{TODO_STATUS_LABELS[status]}</h2>
            </div>
            <div className="todo-card-list">
              {todos.filter((todo) => todo.status === status).map((todo) => (
                <TodoCard todo={todo} onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} key={todo.id} />
              ))}
              {todos.filter((todo) => todo.status === status).length === 0 && <div className="empty-state small">비어 있음</div>}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function TodoCard({ todo, onUpdateTodo, onDeleteTodo }: Pick<TodoPageProps, 'onUpdateTodo' | 'onDeleteTodo'> & { todo: TodoItem }) {
  return (
    <article className={`todo-card priority-${todo.priority}`}>
      <div>
        <strong>{todo.title}</strong>
        {todo.description && <p>{todo.description}</p>}
      </div>
      <div className="todo-card-meta">
        <span>{getPriorityLabel(todo.priority)}</span>
        <span>{todo.source === 'routine' ? '루틴' : '추가'}</span>
        {todo.category && <span>{todo.category}</span>}
        {todo.dueDate && <span>{todo.dueDate}</span>}
      </div>
      <div className="todo-card-actions">
        <select value={todo.status} onChange={(event) => onUpdateTodo(todo.id, { status: event.target.value as TodoStatus })}>
          {STATUS_ORDER.map((status) => <option value={status} key={status}>{TODO_STATUS_LABELS[status]}</option>)}
        </select>
        <button type="button" className="text-button" onClick={() => onDeleteTodo(todo.id)}>삭제</button>
      </div>
    </article>
  );
}

function getPriorityLabel(priority: TodoPriority): string {
  return priority === 'high' ? '높음' : priority === 'medium' ? '보통' : '낮음';
}
