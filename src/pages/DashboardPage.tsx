import { useEffect, useState } from 'react';
import StickyMemoPanel from '../components/StickyMemoPanel';
import type { CreateTodoInput, TodoItem, UpdateTodoInput } from '../types/todo';
import type { DailyTimelineRecord, TimelineItemDefinition, TimelineItemState } from '../types/timeline';
import { SHARED_SCOPE_KEY } from '../types/timeline';
import { getKoreanDateText, getTodayString, isCompletedToday, TODO_STATUS_LABELS } from '../lib/todo';
import { createEmptyItemState, isItemStateComplete, resolveScopeKeys, TIMELINE_ITEM_DEFINITIONS } from '../lib/timeline';

interface DashboardPageProps {
  todos: TodoItem[];
  onCreateTodo: (input: CreateTodoInput) => Promise<void>;
  onUpdateTodo: (id: string, input: Omit<UpdateTodoInput, 'id'>) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
  onNavigateTodo: () => void;
  onNavigateRecords?: () => void;
  date?: string;
  onBackToRecords?: () => void;
  onNavigateToday?: () => void;
}

export default function DashboardPage({
  todos,
  onCreateTodo,
  onUpdateTodo,
  onDeleteTodo,
  onNavigateTodo,
  onNavigateRecords,
  date,
  onBackToRecords,
  onNavigateToday
}: DashboardPageProps) {
  const [quickTitle, setQuickTitle] = useState('');
  const [managedCourses, setManagedCourses] = useState<string[]>([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [timelineRecord, setTimelineRecord] = useState<DailyTimelineRecord | null>(null);
  const [timelineError, setTimelineError] = useState('');

  const isToday = !date || date === getTodayString();
  const manualTodos = todos.filter((todo) => todo.source === 'manual' && todo.status !== 'done');
  const completedToday = todos.filter((todo) => isCompletedToday(todo));
  const timelineCourses = isToday ? managedCourses : timelineRecord?.courses ?? managedCourses;

  useEffect(() => {
    void loadTimelineData();
  }, [date]);

  async function loadTimelineData(): Promise<void> {
    try {
      const [courses, record] = await Promise.all([
        window.cmAssistant.listManagedCourses(),
        isToday ? window.cmAssistant.ensureTodayTimelineRecord() : window.cmAssistant.getTimelineRecord(date!)
      ]);
      setManagedCourses(courses);
      setTimelineRecord(record);
      setTimelineError('');
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : '업무 타임라인을 불러오지 못했습니다.');
    }
  }

  async function handleAddCourse(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = newCourseName.trim();
    if (!name) {
      return;
    }

    try {
      const courses = await window.cmAssistant.addManagedCourse(name);
      setManagedCourses(courses);
      setNewCourseName('');
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : '과정을 추가하지 못했습니다.');
    }
  }

  async function handleRemoveCourse(course: string): Promise<void> {
    try {
      const courses = await window.cmAssistant.removeManagedCourse(course);
      setManagedCourses(courses);
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : '과정을 삭제하지 못했습니다.');
    }
  }

  async function handleUpdateTimelineItem(
    definition: TimelineItemDefinition,
    scope: string,
    patch: { value?: string; note?: string; autoFilled?: boolean }
  ): Promise<void> {
    if (!timelineRecord) {
      return;
    }

    try {
      const updated = await window.cmAssistant.updateTimelineItem({
        date: timelineRecord.date,
        itemKey: definition.key,
        scope,
        ...patch
      });
      setTimelineRecord(updated);
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : '타임라인 항목을 저장하지 못했습니다.');
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
      dueDate: getTodayInputValue(),
      source: 'manual'
    });
    setQuickTitle('');
  }

  const { completedRows, totalRows } = timelineRecord
    ? countTimelineProgress(timelineRecord, timelineCourses)
    : { completedRows: 0, totalRows: 0 };

  const timelineSection = (
    <section className="panel timeline-panel">
      <div className="section-heading">
        <p className="eyebrow">Timeline</p>
        <h2>루틴 체크리스트</h2>
        <p>고정된 순서대로 진행하세요. 드롭다운/텍스트 항목은 값을 입력하면 자동으로 완료 처리됩니다.</p>
      </div>
      <div className="timeline-list">
        {TIMELINE_ITEM_DEFINITIONS.map((definition) => (
          <TimelineItemCard
            definition={definition}
            record={timelineRecord}
            managedCourses={timelineCourses}
            onUpdateItem={handleUpdateTimelineItem}
            key={definition.key}
          />
        ))}
      </div>
    </section>
  );

  return (
    <>
      <section className="hero-card dashboard-hero">
        <div className="hero-main-copy">
          {isToday ? (
            <p className="eyebrow">Today</p>
          ) : (
            <button type="button" className="back-link" onClick={onBackToRecords}>← 목록으로</button>
          )}
          <p className="hero-intent">{isToday ? '오늘 업무 타임라인' : '데일리 업무 체크'}</p>
          <h1>{getKoreanDateText(date ? parseDateString(date) : undefined)}</h1>
          <p className="hero-copy">
            {isToday ? '순서대로 확인하면서 진행하면 오늘 운영이 정리됩니다.' : '지난 기록을 확인하고 필요하면 값을 수정할 수 있습니다.'}
          </p>
        </div>
        <div className="hero-side-panel">
          <span>진행 상황</span>
          <strong>{completedRows}/{totalRows || 1}</strong>
          {isToday ? (
            <>
              <small>추가 업무 {manualTodos.length}개</small>
              <button type="button" className="secondary-button light-button" onClick={onNavigateTodo}>업무 관리</button>
              <button type="button" className="secondary-button light-button" onClick={onNavigateRecords}>전체 기록 보기 →</button>
            </>
          ) : (
            <button type="button" className="secondary-button light-button" onClick={onNavigateToday}>오늘로 이동</button>
          )}
        </div>
      </section>

      {timelineError && <p className="status-message error app-level-message">{timelineError}</p>}

      {isToday && (
        <section className="panel quiet-panel managed-courses-panel">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">Courses</p>
              <h2>담당 과정</h2>
              <p>담당하는 과정을 등록하면 타임라인 항목을 과정별로 따로 체크할 수 있습니다.</p>
            </div>
          </div>
          <form className="course-chip-form" onSubmit={handleAddCourse}>
            <input
              className="text-input line-input"
              value={newCourseName}
              onChange={(event) => setNewCourseName(event.target.value)}
              placeholder="예: PD_8기"
            />
            <button type="submit" className="accent-button">과정 추가</button>
          </form>
          <div className="course-chip-list">
            {managedCourses.map((course) => (
              <span className="course-chip" key={course}>
                {course}
                <button type="button" aria-label={`${course} 삭제`} onClick={() => handleRemoveCourse(course)}>×</button>
              </span>
            ))}
            {managedCourses.length === 0 && <span className="course-chip-empty">담당 과정이 없으면 항목당 1개 값으로 표시됩니다.</span>}
          </div>
        </section>
      )}

      {isToday ? (
        <div className="today-layout">
          <div className="today-main-column">
            {timelineSection}

            <section className="dashboard-grid secondary-dashboard-grid">
              <div className="panel">
                <div className="section-heading split-heading">
                  <div>
                    <p className="eyebrow">Added</p>
                    <h2>추가 업무</h2>
                    <p>갑자기 생긴 업무를 바로 적어두세요.</p>
                  </div>
                </div>
                <form className="quick-add-form" onSubmit={handleQuickAdd}>
                  <input className="text-input line-input" value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="생각난 업무를 적어두세요 (Enter를 누르면 바로 추가)" />
                  <button type="submit" className="accent-button">추가</button>
                </form>
                <TodoPreviewList todos={manualTodos} emptyText="추가 업무가 없습니다." mode="manual" onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />
              </div>

              <div className="panel">
                <div className="section-heading">
                  <p className="eyebrow">Done</p>
                  <h2>오늘 완료</h2>
                  <p>오늘 체크한 업무 기록입니다.</p>
                </div>
                <TodoPreviewList todos={completedToday} emptyText="오늘 완료한 업무가 없습니다." mode="readonly" onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />
              </div>
            </section>
          </div>

          <StickyMemoPanel />
        </div>
      ) : (
        timelineSection
      )}
    </>
  );
}

function parseDateString(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function TimelineItemCard({
  definition,
  record,
  managedCourses,
  onUpdateItem
}: {
  definition: TimelineItemDefinition;
  record: DailyTimelineRecord | null;
  managedCourses: string[];
  onUpdateItem: (definition: TimelineItemDefinition, scope: string, patch: { value?: string; note?: string; autoFilled?: boolean }) => Promise<void>;
}) {
  const scopes = resolveScopeKeys(definition, managedCourses);
  const states = scopes.map((scope) => record?.items[definition.key]?.[scope] ?? createEmptyItemState());
  const isFullyComplete = states.length > 0 && states.every((state) => isItemStateComplete(definition, state));
  const isSingleRow = scopes.length === 1;

  return (
    <article className={`timeline-item${isFullyComplete ? ' complete' : ''}`}>
      <div className="timeline-item-header">
        {isSingleRow ? (
          <TimelineBadge
            definition={definition}
            state={states[0]}
            isComplete={isFullyComplete}
            onToggle={definition.type === 'checkbox' ? () => onUpdateItem(definition, scopes[0], { value: states[0].value === 'done' ? '' : 'done' }) : undefined}
          />
        ) : (
          <span className={`timeline-badge${isFullyComplete ? ' complete' : ''}`}>{isFullyComplete ? '✓' : definition.order}</span>
        )}
        <div>
          <strong>{definition.label}</strong>
          <span className="timeline-time-label">{definition.timeLabel}</span>
        </div>
      </div>

      <div className="timeline-item-rows">
        {scopes.map((scope, index) => (
          <TimelineItemRow
            key={scope}
            definition={definition}
            scope={scope}
            showScopeLabel={!isSingleRow}
            state={states[index]}
            onCommit={(patch) => onUpdateItem(definition, scope, patch)}
          />
        ))}
      </div>
    </article>
  );
}

function TimelineBadge({
  definition,
  state,
  isComplete,
  onToggle
}: {
  definition: TimelineItemDefinition;
  state: TimelineItemState;
  isComplete: boolean;
  onToggle?: () => void;
}) {
  if (onToggle) {
    return (
      <button type="button" className={`timeline-badge clickable${isComplete ? ' complete' : ''}`} onClick={onToggle} aria-pressed={isComplete} aria-label={`${definition.label} 완료 처리`}>
        {isComplete ? '✓' : definition.order}
      </button>
    );
  }

  return <span className={`timeline-badge${isComplete ? ' complete' : ''}`}>{isComplete ? '✓' : definition.order}</span>;
}

function TimelineItemRow({
  definition,
  scope,
  showScopeLabel,
  state,
  onCommit
}: {
  definition: TimelineItemDefinition;
  scope: string;
  showScopeLabel: boolean;
  state: TimelineItemState;
  onCommit: (patch: { value?: string; note?: string; autoFilled?: boolean }) => Promise<void>;
}) {
  const [textValue, setTextValue] = useState(state.value);
  const [noteValue, setNoteValue] = useState(state.note ?? '');

  useEffect(() => {
    setTextValue(state.value);
    setNoteValue(state.note ?? '');
  }, [state.value, state.note]);

  function handleTextBlur(): void {
    if (textValue.trim() === (state.value ?? '').trim()) {
      return;
    }

    void onCommit({ value: textValue, autoFilled: false });
  }

  function handleNoteBlur(): void {
    if (noteValue.trim() === (state.note ?? '').trim()) {
      return;
    }

    void onCommit({ note: noteValue });
  }

  const scopeLabel = scope === SHARED_SCOPE_KEY ? null : scope;

  return (
    <div className="timeline-item-row">
      {showScopeLabel && <span className="timeline-scope-label">{scopeLabel}</span>}

      {definition.type === 'checkbox' && showScopeLabel && (
        <button
          type="button"
          className={`timeline-row-check${state.value === 'done' ? ' complete' : ''}`}
          onClick={() => onCommit({ value: state.value === 'done' ? '' : 'done' })}
        >
          {state.value === 'done' ? '완료' : '완료 처리'}
        </button>
      )}

      {definition.type === 'dropdown' && (
        <>
          <select
            className="text-input"
            value={state.value || definition.options?.[0] || ''}
            onChange={(event) => void onCommit({ value: event.target.value })}
          >
            {definition.options?.map((option) => <option value={option} key={option}>{option}</option>)}
          </select>
          {definition.hasNoteOnValue && state.value === definition.hasNoteOnValue && (
            <textarea
              className="report-output compact-output timeline-note-input"
              value={noteValue}
              onChange={(event) => setNoteValue(event.target.value)}
              onBlur={handleNoteBlur}
              placeholder="특이사항을 서술형으로 입력해주세요."
            />
          )}
        </>
      )}

      {definition.type === 'text' && (
        <div className="timeline-text-field">
          {state.autoFilled && <span className="timeline-autofill-tag">자동기재</span>}
          <textarea
            className="report-output compact-output"
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            onBlur={handleTextBlur}
            placeholder="값을 입력하면 자동으로 완료 처리됩니다."
          />
        </div>
      )}
    </div>
  );
}

function countTimelineProgress(record: DailyTimelineRecord, managedCourses: string[]): { completedRows: number; totalRows: number } {
  let completedRows = 0;
  let totalRows = 0;

  for (const definition of TIMELINE_ITEM_DEFINITIONS) {
    const scopes = resolveScopeKeys(definition, managedCourses);
    for (const scope of scopes) {
      totalRows += 1;
      const state = record.items[definition.key]?.[scope];
      if (state && isItemStateComplete(definition, state)) {
        completedRows += 1;
      }
    }
  }

  return { completedRows, totalRows };
}

type TodoPreviewMode = 'manual' | 'readonly';

interface TodoPreviewActions {
  onUpdateTodo: (id: string, input: Omit<UpdateTodoInput, 'id'>) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
}

function TodoPreviewList({ todos, emptyText, mode, onUpdateTodo, onDeleteTodo }: { todos: TodoItem[]; emptyText: string; mode: TodoPreviewMode } & TodoPreviewActions) {
  if (todos.length === 0) {
    return <div className="empty-state small">{emptyText}</div>;
  }

  return (
    <div className="todo-preview-list dashboard-scroll-list">
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
        {mode === 'manual' && (
          <button type="button" className="mini-button" onClick={() => onUpdateTodo(todo.id, { status: 'done' })}>완료</button>
        )}
        {mode === 'manual' && <button type="button" className="icon-button" aria-label={`${todo.title} 삭제`} onClick={() => onDeleteTodo(todo.id)}>×</button>}
      </div>
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
