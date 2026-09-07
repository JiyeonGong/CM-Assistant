import type { TodoItem } from '../types/todo';
import { isHolidayTodo, isNoClassTodo } from './todo';
import { SHARED_SCOPE_KEY } from '../types/timeline';
import type { DailyTimelineRecord, DayFlags, TimelineItemDefinition, TimelineItemState } from '../types/timeline';

const SPOT_CHECK_OPTIONS = ['선택', '특이사항없음', '특이사항있음'];
const SPOT_CHECK_FINDING_VALUE = '특이사항있음';

export const TIMELINE_ITEM_DEFINITIONS: TimelineItemDefinition[] = [
  { key: 'checkIn', order: 1, label: '출근보고', timeLabel: '08:30~09:00', type: 'checkbox', courseScoped: false },
  { key: 'amMainInstructorCheck', order: 2, label: '주강사입실확인 · 오전', timeLabel: '08:50', type: 'checkbox', courseScoped: true },
  { key: 'morningAttendanceReport', order: 3, label: '오전출결보고', timeLabel: '~09:20', type: 'text', courseScoped: true, autoFillSource: 'morningAttendanceReport' },
  { key: 'spotCheck2', order: 4, label: '2교시 불시점검', timeLabel: '10:15', type: 'dropdown', courseScoped: true, options: SPOT_CHECK_OPTIONS, hasNoteOnValue: SPOT_CHECK_FINDING_VALUE },
  { key: 'logComparisonResult', order: 5, label: '로그대조결과공유', timeLabel: '~11:10', type: 'text', courseScoped: true, autoFillSource: 'logComparisonResult' },
  { key: 'prevDayLogAndLeaveRequest', order: 6, label: '전일로그대조 · 휴공가자 출석입력요청', timeLabel: '~11:20', type: 'text', courseScoped: true, autoFillSource: 'previousClassDay' },
  { key: 'spotCheck3', order: 7, label: '3교시 불시점검', timeLabel: '11:15', type: 'dropdown', courseScoped: true, options: SPOT_CHECK_OPTIONS, hasNoteOnValue: SPOT_CHECK_FINDING_VALUE },
  { key: 'spotCheck4', order: 8, label: '4교시 불시점검', timeLabel: '12:15', type: 'dropdown', courseScoped: true, options: SPOT_CHECK_OPTIONS, hasNoteOnValue: SPOT_CHECK_FINDING_VALUE },
  { key: 'spotCheck5', order: 9, label: '5교시 불시점검', timeLabel: '13:15', type: 'dropdown', courseScoped: true, options: SPOT_CHECK_OPTIONS, hasNoteOnValue: SPOT_CHECK_FINDING_VALUE },
  { key: 'spotCheck6', order: 10, label: '6교시 불시점검', timeLabel: '14:15', type: 'dropdown', courseScoped: true, options: SPOT_CHECK_OPTIONS, hasNoteOnValue: SPOT_CHECK_FINDING_VALUE },
  { key: 'spotCheck7', order: 11, label: '7교시 불시점검', timeLabel: '15:15', type: 'dropdown', courseScoped: true, options: SPOT_CHECK_OPTIONS, hasNoteOnValue: SPOT_CHECK_FINDING_VALUE },
  { key: 'spotCheck8', order: 12, label: '8교시 불시점검', timeLabel: '16:15', type: 'dropdown', courseScoped: true, options: SPOT_CHECK_OPTIONS, hasNoteOnValue: SPOT_CHECK_FINDING_VALUE },
  { key: 'spotCheck9', order: 13, label: '9교시 불시점검', timeLabel: '17:15', type: 'dropdown', courseScoped: true, options: SPOT_CHECK_OPTIONS, hasNoteOnValue: SPOT_CHECK_FINDING_VALUE },
  { key: 'pmMainInstructorCheck', order: 14, label: '주강사입실확인 · 오후', timeLabel: '13:50', type: 'checkbox', courseScoped: true },
  { key: 'afternoonAttendanceReport', order: 15, label: '오후출결보고', timeLabel: '~14:20', type: 'text', courseScoped: true, autoFillSource: 'afternoonAttendanceReport' },
  { key: 'nextDayAttendanceRequestPlan', order: 16, label: '출석입력요청 익일 처리 예정내역 정리', timeLabel: '~18:00', type: 'text', courseScoped: false },
  { key: 'finalAttendanceReport', order: 17, label: '최종출결보고', timeLabel: '~19:00', type: 'text', courseScoped: true, autoFillSource: 'finalAttendanceReport' }
];

const SPOT_CHECK_ITEM_KEYS = TIMELINE_ITEM_DEFINITIONS.filter((item) => item.type === 'dropdown').map((item) => item.key);

export function getTimelineItemDefinition(key: string): TimelineItemDefinition | undefined {
  return TIMELINE_ITEM_DEFINITIONS.find((item) => item.key === key);
}

export function resolveScopeKeys(definition: TimelineItemDefinition, courses: string[]): string[] {
  if (!definition.courseScoped) {
    return [SHARED_SCOPE_KEY];
  }

  return courses.length > 0 ? courses : [SHARED_SCOPE_KEY];
}

export function createEmptyItemState(): TimelineItemState {
  return { value: '', completed: false, autoFilled: false, updatedAt: new Date().toISOString() };
}

export function createEmptyTimelineRecord(date: string, courses: string[]): DailyTimelineRecord {
  const now = new Date().toISOString();
  const items: DailyTimelineRecord['items'] = {};

  for (const definition of TIMELINE_ITEM_DEFINITIONS) {
    const scopeMap: Record<string, TimelineItemState> = {};
    for (const scope of resolveScopeKeys(definition, courses)) {
      scopeMap[scope] = createEmptyItemState();
    }
    items[definition.key] = scopeMap;
  }

  return { date, courses: [...courses], items, createdAt: now, updatedAt: now };
}

export function isItemStateComplete(definition: TimelineItemDefinition, state: Pick<TimelineItemState, 'value'> | undefined): boolean {
  if (!state) {
    return false;
  }

  if (definition.type === 'checkbox') {
    return state.value === 'done';
  }

  if (definition.type === 'dropdown') {
    return Boolean(state.value) && state.value !== SPOT_CHECK_OPTIONS[0];
  }

  return state.value.trim().length > 0;
}

export function findPreviousClassDayRecord(
  records: DailyTimelineRecord[],
  todos: TodoItem[],
  beforeDate: string
): DailyTimelineRecord | undefined {
  const sortedDates = [...new Set(records.map((record) => record.date))]
    .filter((date) => date < beforeDate)
    .sort((a, b) => (a < b ? 1 : -1));

  for (const date of sortedDates) {
    const isTaggedOff = todos.some((todo) => todo.dueDate === date && (isNoClassTodo(todo) || isHolidayTodo(todo)));
    if (isTaggedOff) {
      continue;
    }

    const record = records.find((item) => item.date === date);
    if (record) {
      return record;
    }
  }

  return undefined;
}

export function computeDayFlags(record: DailyTimelineRecord | undefined, course?: string): DayFlags {
  if (!record) {
    return { hasLogMismatch: false, hasSpotCheckFinding: false };
  }

  const getStates = (itemKey: string): TimelineItemState[] => {
    const scopeMap = record.items[itemKey] ?? {};
    if (course) {
      const state = scopeMap[course];
      return state ? [state] : [];
    }

    return Object.values(scopeMap);
  };

  const hasLogMismatch = getStates('logComparisonResult').some((state) => state.value.trim().length > 0);

  const hasSpotCheckFinding = SPOT_CHECK_ITEM_KEYS.some((key) =>
    getStates(key).some((state) => state.value === SPOT_CHECK_FINDING_VALUE)
  );

  return { hasLogMismatch, hasSpotCheckFinding };
}
