export type TodoStatus = 'todo' | 'in_progress' | 'done' | 'hold';
export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoSource = 'manual' | 'routine';

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TodoPriority;
  category?: string;
  dueDate?: string;
  source: TodoSource;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority: TodoPriority;
  category?: string;
  dueDate?: string;
  source?: TodoSource;
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  category?: string;
  dueDate?: string;
  source?: TodoSource;
}

export interface TodoStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  hold: number;
}
