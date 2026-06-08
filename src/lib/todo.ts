import type { TodoItem, TodoStats, TodoStatus } from '../types/todo';

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  todo: '진행 전',
  in_progress: '진행 중',
  done: '완료',
  hold: '보류'
};

export function getTodayString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getKoreanDateText(date = new Date()): string {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdays[date.getDay()]}요일`;
}

export function getTodoStats(todos: TodoItem[]): TodoStats {
  return {
    total: todos.length,
    todo: todos.filter((todo) => todo.status === 'todo').length,
    inProgress: todos.filter((todo) => todo.status === 'in_progress').length,
    done: todos.filter((todo) => todo.status === 'done').length,
    hold: todos.filter((todo) => todo.status === 'hold').length
  };
}

export function isTodoForToday(todo: TodoItem, today = getTodayString()): boolean {
  if (todo.status === 'done') {
    return false;
  }

  if (todo.source === 'routine') {
    return todo.dueDate === today;
  }

  return !todo.dueDate || todo.dueDate <= today;
}

export function isCompletedToday(todo: TodoItem, today = getTodayString()): boolean {
  return todo.status === 'done' && Boolean(todo.completedAt?.startsWith(today));
}
