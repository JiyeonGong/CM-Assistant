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
  const [routineMessage, setRoutineMessage] = useState('');
  const [showCompletedTodos, setShowCompletedTodos] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(getTodayString());
  const visibleTodos = todos.filter((todo) => todo.status !== 'done');
  const completedTodos = todos.filter((todo) => todo.status === 'done');

  useEffect(() => {
    void loadRoutineTemplates();
  }, []);

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
    setRoutineMessage('내일부터 매일 루틴으로 생성됩니다. 오늘만 필요한 일은 위에서 추가 업무로 등록하세요.');
    await loadRoutineTemplates();
  }

  async function handleToggleRoutineTemplate(template: RoutineTemplate): Promise<void> {
    await window.cmAssistant.updateRoutineTemplateEnabled(template.id, !template.enabled);
    setRoutineMessage(!template.enabled ? '내일부터 다시 루틴으로 생성됩니다.' : '내일부터 이 루틴은 자동 생성되지 않습니다.');
    await loadRoutineTemplates();
  }

  async function handleRenameRoutineTemplate(template: RoutineTemplate): Promise<void> {
    const title = window.prompt('루틴 제목을 수정하세요.', template.title)?.trim();
    if (!title || title === template.title) {
      return;
    }

    await window.cmAssistant.updateRoutineTemplate({ id: template.id, title });
    setRoutineMessage('루틴 제목을 수정했습니다. 오늘 이미 생성된 업무는 그대로 두고 다음 생성부터 반영됩니다.');
    await loadRoutineTemplates();
  }

  return (
    <>
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

      <MonthlyTodoCalendar
        todos={todos}
        month={calendarMonth}
        selectedDate={selectedCalendarDate}
        onChangeMonth={setCalendarMonth}
        onSelectDate={setSelectedCalendarDate}
      />

      <section className="todo-list-layout">
        <div className="panel todo-list-panel">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">Open</p>
              <h2>처리할 업무</h2>
            </div>
            <strong>{visibleTodos.length}개</strong>
          </div>
          <div className="todo-row-list">
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
            <div className="todo-row-list">
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
                <strong>{template.title}</strong>
                <span>{template.category ?? '루틴'} · {getPriorityLabel(template.priority)} · {template.startsOn}부터</span>
              </div>
              <div className="routine-template-actions">
                <button type="button" className="secondary-button" onClick={() => handleRenameRoutineTemplate(template)}>수정</button>
                <button type="button" className={template.enabled ? 'secondary-button' : 'primary-button'} onClick={() => handleToggleRoutineTemplate(template)}>
                  {template.enabled ? '사용 중' : '다시 사용'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {routineMessage && <p className="status-message info routine-template-message">{routineMessage}</p>}
      </section>
    </>
  );
}

function MonthlyTodoCalendar({
  todos,
  month,
  selectedDate,
  onChangeMonth,
  onSelectDate
}: {
  todos: TodoItem[];
  month: Date;
  selectedDate: string;
  onChangeMonth: (date: Date) => void;
  onSelectDate: (date: string) => void;
}) {
  const calendarDays = getCalendarDays(month);
  const selectedTodos = getTodosForCalendarDate(todos, selectedDate);
  const monthLabel = `${month.getFullYear()}년 ${month.getMonth() + 1}월`;

  return (
    <section className="panel calendar-panel">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2>월간 보기</h2>
          <p>날짜별 업무, 개인 일정, 휴강을 함께 확인합니다.</p>
        </div>
        <div className="calendar-month-actions">
          <button type="button" className="secondary-button" onClick={() => onChangeMonth(addMonths(month, -1))}>이전</button>
          <strong>{monthLabel}</strong>
          <button type="button" className="secondary-button" onClick={() => onChangeMonth(addMonths(month, 1))}>다음</button>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-grid" role="grid" aria-label="월간 업무 캘린더">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <div className={`calendar-weekday ${index === 0 ? 'sunday' : ''} ${index === 6 ? 'saturday' : ''}`} key={day}>{day}</div>
          ))}
          {calendarDays.map((day) => {
            const dateKey = getTodayString(day);
            const dayTodos = getTodosForCalendarDate(todos, dateKey);
            const personalTodos = dayTodos.filter(isPersonalTodo);
            const noClassTodos = dayTodos.filter(isNoClassTodo);
            const holidayTodos = dayTodos.filter(isHolidayTodo);
            const leaveTodos = dayTodos.filter(isLeaveTodo);
            const hasScheduleItems = personalTodos.length > 0 || noClassTodos.length > 0 || holidayTodos.length > 0 || leaveTodos.length > 0;
            const workTodos = dayTodos.filter((todo) => !isCalendarScheduleTodo(todo));
            const doneCount = workTodos.filter((todo) => todo.status === 'done').length;
            const isSelected = selectedDate === dateKey;
            const isCurrentMonth = day.getMonth() === month.getMonth();

            return (
              <button
                type="button"
                className={[
                  'calendar-day',
                  isSelected ? 'selected' : '',
                  isCurrentMonth ? '' : 'muted',
                  day.getDay() === 0 ? 'sunday' : '',
                  day.getDay() === 6 ? 'saturday' : '',
                  hasScheduleItems ? 'has-schedule' : '',
                  dateKey === getTodayString() ? 'today' : ''
                ].filter(Boolean).join(' ')}
                onClick={() => onSelectDate(dateKey)}
                key={dateKey}
              >
                <span>{day.getDate()}</span>
                <div className="calendar-day-meta">
                  {workTodos.length > 0 && <small>{doneCount}/{workTodos.length} 완료</small>}
                  {personalTodos.length > 0 && <small className="event-count">일정 {personalTodos.length}개</small>}
                  {noClassTodos.length > 0 && <small className="no-class-count">휴강 {noClassTodos.length}건</small>}
                  {holidayTodos.length > 0 && <small className="holiday-count">공휴일 {holidayTodos.length}건</small>}
                  {leaveTodos.length > 0 && <small className="leave-count">연차 {leaveTodos.length}건</small>}
                </div>
              </button>
            );
          })}
        </div>

        <aside className="calendar-detail">
          <div>
            <p className="eyebrow">Selected</p>
            <h3>{formatCalendarDetailDate(selectedDate)}</h3>
          </div>
          <div className="calendar-detail-list">
            {selectedTodos.map((todo) => (
              <div className={getCalendarDetailClassName(todo)} key={todo.id}>
                <strong>{todo.title}</strong>
                <span>{getCalendarTodoMeta(todo)}</span>
              </div>
            ))}
            {selectedTodos.length === 0 && <div className="empty-state small">선택한 날짜의 업무나 일정이 없습니다.</div>}
          </div>
        </aside>
      </div>
    </section>
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

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getCalendarDays(month: Date): Date[] {
  const firstDay = startOfMonth(month);
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

function getTodoCalendarDate(todo: TodoItem): string {
  if (todo.dueDate) {
    return todo.dueDate;
  }

  if (todo.completedAt) {
    return todo.completedAt.slice(0, 10);
  }

  return todo.createdAt.slice(0, 10);
}

function getTodosForCalendarDate(todos: TodoItem[], date: string): TodoItem[] {
  return todos.filter((todo) => getTodoCalendarDate(todo) === date);
}

function formatCalendarDetailDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${month}월 ${day}일 ${weekdays[value.getDay()]}요일`;
}

function isPersonalTodo(todo: TodoItem): boolean {
  return todo.category === '개인';
}

function isNoClassTodo(todo: TodoItem): boolean {
  return todo.category === '휴강';
}

function isHolidayTodo(todo: TodoItem): boolean {
  return todo.category === '공휴일';
}

function isLeaveTodo(todo: TodoItem): boolean {
  return todo.category === '연차';
}

function isCalendarScheduleTodo(todo: TodoItem): boolean {
  return isPersonalTodo(todo) || isNoClassTodo(todo) || isHolidayTodo(todo) || isLeaveTodo(todo);
}

function getCalendarDetailClassName(todo: TodoItem): string {
  if (isPersonalTodo(todo)) {
    return 'calendar-detail-item schedule-event-item';
  }

  if (isNoClassTodo(todo)) {
    return 'calendar-detail-item no-class-item';
  }

  if (isHolidayTodo(todo)) {
    return 'calendar-detail-item holiday-item';
  }

  if (isLeaveTodo(todo)) {
    return 'calendar-detail-item leave-item';
  }

  return 'calendar-detail-item';
}

function getCalendarTodoMeta(todo: TodoItem): string {
  if (isCalendarScheduleTodo(todo)) {
    return [todo.category, todo.description].filter(Boolean).join(' · ');
  }

  return `${TODO_STATUS_LABELS[todo.status]} · ${todo.source === 'routine' ? '루틴' : todo.category ?? '추가'}`;
}
