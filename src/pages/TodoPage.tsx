import { useEffect, useState } from 'react';
import { getTodayString, TODO_STATUS_LABELS } from '../lib/todo';
import type { CreateTodoInput, RoutineTemplate, TodoItem, TodoPriority, TodoStatus } from '../types/todo';

interface TodoPageProps {
  todos: TodoItem[];
  onCreateTodo: (input: CreateTodoInput) => Promise<void>;
  onUpdateTodo: (id: string, input: Partial<Pick<TodoItem, 'status' | 'priority' | 'title' | 'category' | 'dueDate' | 'description'>>) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
}

const STATUS_ORDER: TodoStatus[] = ['todo', 'in_progress', 'done', 'hold'];
const TODO_CATEGORY_OPTIONS = ['업무', '개인', '휴강', '공휴일', '연차'];

export default function TodoPage({ todos, onCreateTodo, onUpdateTodo, onDeleteTodo }: TodoPageProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [category, setCategory] = useState('업무');
  const [dueDate, setDueDate] = useState(getTodayString());
  const [description, setDescription] = useState('');
  const [routineTemplates, setRoutineTemplates] = useState<RoutineTemplate[]>([]);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineToastMessage, setRoutineToastMessage] = useState('');
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editingRoutineTitle, setEditingRoutineTitle] = useState('');
  const [showCompletedTodos, setShowCompletedTodos] = useState(false);
  const visibleTodos = todos.filter((todo) => todo.status !== 'done');
  const completedTodos = todos.filter((todo) => todo.status === 'done');

  useEffect(() => {
    void loadRoutineTemplates();
  }, []);

  useEffect(() => {
    if (!routineToastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setRoutineToastMessage(''), 2_400);
    return () => window.clearTimeout(timeoutId);
  }, [routineToastMessage]);

  async function loadRoutineTemplates(): Promise<void> {
    const templates = await window.cmAssistant.listRoutineTemplates();
    setRoutineTemplates(templates);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await onCreateTodo({ title, priority, category, dueDate, description });
    setTitle('');
    setCategory('업무');
    setDescription('');
  }

  async function handleCreateRoutineTemplate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!routineTitle.trim()) {
      return;
    }

    await window.cmAssistant.createRoutineTemplate({ title: routineTitle, priority: 'medium', category: '내 루틴' });
    setRoutineTitle('');
    setRoutineToastMessage('내일부터 매일 루틴으로 생성됩니다. 오늘만 필요한 일은 위에서 추가 업무로 등록하세요.');
    await loadRoutineTemplates();
  }

  async function handleToggleRoutineTemplate(template: RoutineTemplate): Promise<void> {
    await window.cmAssistant.updateRoutineTemplateEnabled(template.id, !template.enabled);
    setRoutineToastMessage(!template.enabled ? '내일부터 다시 루틴으로 생성됩니다.' : '내일부터 이 루틴은 자동 생성되지 않습니다.');
    await loadRoutineTemplates();
  }

  function handleStartEditRoutineTemplate(template: RoutineTemplate): void {
    setEditingRoutineId(template.id);
    setEditingRoutineTitle(template.title);
    setRoutineToastMessage('');
  }

  async function handleSaveRoutineTemplate(template: RoutineTemplate): Promise<void> {
    const title = editingRoutineTitle.trim();
    if (!title) {
      setRoutineToastMessage('루틴 제목을 입력해주세요.');
      return;
    }

    if (title === template.title) {
      handleCancelEditRoutineTemplate();
      return;
    }

    await window.cmAssistant.updateRoutineTemplate({ id: template.id, title });
    handleCancelEditRoutineTemplate();
    setRoutineToastMessage('루틴 제목을 수정했습니다. 오늘 이미 생성된 업무는 그대로 두고 다음 생성부터 반영됩니다.');
    await loadRoutineTemplates();
  }

  function handleCancelEditRoutineTemplate(): void {
    setEditingRoutineId(null);
    setEditingRoutineTitle('');
  }

  async function handleDeleteRoutineTemplate(template: RoutineTemplate): Promise<void> {
    await window.cmAssistant.deleteRoutineTemplate(template.id);
    if (editingRoutineId === template.id) {
      handleCancelEditRoutineTemplate();
    }
    setRoutineToastMessage('루틴을 삭제했습니다. 오늘 이미 생성된 업무는 그대로 두고 다음 생성부터 반영됩니다.');
    await loadRoutineTemplates();
  }

  return (
    <>
      {routineToastMessage && (
        <div className="quick-message-toast success" role="status" aria-live="polite">
          {routineToastMessage}
        </div>
      )}
      <section className="hero-card compact-hero simple-hero">
        <div>
          <p className="eyebrow">Manage</p>
          <h1>업무와 루틴을 관리해요</h1>
          <p className="hero-copy">오늘 업무, 완료 기록, 매일 반복되는 내 루틴을 정리합니다.</p>
        </div>
      </section>

      <section className="panel quiet-panel">
        <form className="todo-form" onSubmit={handleSubmit}>
          <input className="text-input line-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="새 업무" />
          <select className="text-input" value={priority} onChange={(event) => setPriority(event.target.value as TodoPriority)}>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
          <select className="text-input" value={category} onChange={(event) => setCategory(event.target.value)}>
            {TODO_CATEGORY_OPTIONS.map((option) => <option value={option} key={option}>{option}</option>)}
          </select>
          <input className="text-input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <input className="text-input todo-description-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="메모" />
          <button type="submit" className="accent-button">추가</button>
        </form>
      </section>

      <section className="todo-list-layout">
        <div className="panel todo-list-panel">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">Open</p>
              <h2>처리할 업무</h2>
            </div>
            <strong>{visibleTodos.length}개</strong>
          </div>
          <div className="todo-row-list scrollable-open-todos">
            {visibleTodos.map((todo) => (
              <TodoCard
                todo={todo}
                isReadonly={false}
                onUpdateTodo={onUpdateTodo}
                onDeleteTodo={onDeleteTodo}
                key={todo.id}
              />
            ))}
            {visibleTodos.length === 0 && <div className="empty-state small">처리할 업무가 없습니다.</div>}
          </div>
        </div>

        <div className="panel todo-list-panel muted-panel">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">Done</p>
              <h2>완료한 업무</h2>
            </div>
            <button type="button" className="secondary-button" onClick={() => setShowCompletedTodos((value) => !value)}>
              {showCompletedTodos ? '접기' : `${completedTodos.length}개 보기`}
            </button>
          </div>
          {showCompletedTodos && (
            <div className="todo-row-list scrollable-completed-todos">
              {completedTodos.map((todo) => (
                <TodoCard
                  todo={todo}
                  isReadonly
                  onUpdateTodo={onUpdateTodo}
                  onDeleteTodo={onDeleteTodo}
                  key={todo.id}
                />
              ))}
              {completedTodos.length === 0 && <div className="empty-state small">완료한 업무가 없습니다.</div>}
            </div>
          )}
        </div>
      </section>

      <section className="panel routine-manager-panel">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Routine</p>
            <h2>내 루틴 관리</h2>
            <p>매일 자동으로 생기는 내 업무예요. 오늘만 필요한 일은 위에서 추가 업무로 등록하세요.</p>
          </div>
          <strong>{routineTemplates.filter((template) => template.enabled).length}개 사용 중</strong>
        </div>

        <form className="routine-template-form" onSubmit={handleCreateRoutineTemplate}>
          <input className="text-input line-input" value={routineTitle} onChange={(event) => setRoutineTitle(event.target.value)} placeholder="매일 반복할 업무" />
          <button type="submit" className="accent-button">루틴 추가</button>
        </form>

        <div className="routine-template-list">
          {routineTemplates.map((template) => (
            <div className={template.enabled ? 'routine-template-item' : 'routine-template-item disabled'} key={template.id}>
              <div>
                {editingRoutineId === template.id ? (
                  <input
                    className="text-input line-input routine-template-edit-input"
                    value={editingRoutineTitle}
                    onChange={(event) => setEditingRoutineTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleSaveRoutineTemplate(template);
                      }
                      if (event.key === 'Escape') {
                        handleCancelEditRoutineTemplate();
                      }
                    }}
                    aria-label={`${template.title} 루틴 제목 수정`}
                    autoFocus
                  />
                ) : (
                  <strong>{template.title}</strong>
                )}
                <span>{template.category ?? '루틴'} · {getPriorityLabel(template.priority)} · {template.startsOn}부터</span>
              </div>
              <div className="routine-template-actions">
                {editingRoutineId === template.id ? (
                  <>
                    <button type="button" className="primary-button" onClick={() => handleSaveRoutineTemplate(template)}>저장</button>
                    <button type="button" className="secondary-button" onClick={handleCancelEditRoutineTemplate}>취소</button>
                  </>
                ) : (
                  <button type="button" className="secondary-button" onClick={() => handleStartEditRoutineTemplate(template)}>수정</button>
                )}
                <button type="button" className={template.enabled ? 'secondary-button' : 'primary-button'} onClick={() => handleToggleRoutineTemplate(template)}>
                  {template.enabled ? '사용 중' : '다시 사용'}
                </button>
                <button type="button" className="secondary-button danger-button" onClick={() => handleDeleteRoutineTemplate(template)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function TodoCard({
  todo,
  isReadonly,
  onUpdateTodo,
  onDeleteTodo
}: Pick<TodoPageProps, 'onUpdateTodo' | 'onDeleteTodo'> & {
  todo: TodoItem;
  isReadonly: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description ?? '');

  async function handleSaveEdit(): Promise<void> {
    await onUpdateTodo(todo.id, { title: editTitle, description: editDescription });
    setIsEditing(false);
  }

  return (
    <article className={`todo-card todo-row priority-${todo.priority}`}>
      <div>
        {isEditing ? (
          <div className="todo-edit-form">
            <input className="text-input line-input" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            <input className="text-input" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} placeholder="메모" />
            <div className="todo-edit-actions">
              <button type="button" className="primary-button" onClick={handleSaveEdit}>저장</button>
              <button type="button" className="secondary-button" onClick={() => setIsEditing(false)}>취소</button>
            </div>
          </div>
        ) : (
          <>
            <strong>{todo.title}</strong>
            {todo.description && <p>{todo.description}</p>}
          </>
        )}
      </div>
      <div className="todo-card-meta">
        <span>{todo.source === 'routine' ? '루틴' : '추가'}</span>
        {todo.source === 'manual' && <span>{getPriorityLabel(todo.priority)}</span>}
        {todo.category && <span>{todo.category}</span>}
        {todo.dueDate && <span>{todo.dueDate}</span>}
      </div>
      <div className="todo-card-actions">
        <div className="todo-status-action">
          <select value={todo.status} onChange={(event) => onUpdateTodo(todo.id, { status: event.target.value as TodoStatus })}>
            {STATUS_ORDER.map((status) => <option value={status} key={status}>{TODO_STATUS_LABELS[status]}</option>)}
          </select>
        </div>
        <div className="todo-management-actions">
          {!isReadonly && <button type="button" className="secondary-button" onClick={() => setIsEditing(true)}>수정</button>}
          <button type="button" className="text-button" onClick={() => onDeleteTodo(todo.id)}>삭제</button>
        </div>
      </div>
    </article>
  );
}

function getPriorityLabel(priority: TodoPriority): string {
  return priority === 'high' ? '높음' : priority === 'medium' ? '보통' : '낮음';
}
