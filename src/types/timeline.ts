export type TimelineItemType = 'checkbox' | 'dropdown' | 'text';

export type TimelineAutoFillSource =
  | 'morningAttendanceReport'
  | 'afternoonAttendanceReport'
  | 'finalAttendanceReport'
  | 'logComparisonResult'
  | 'previousClassDay';

export interface TimelineItemDefinition {
  key: string;
  order: number;
  label: string;
  timeLabel: string;
  type: TimelineItemType;
  courseScoped: boolean;
  options?: string[];
  hasNoteOnValue?: string;
  autoFillSource?: TimelineAutoFillSource;
}

export interface TimelineItemState {
  value: string;
  note?: string;
  completed: boolean;
  autoFilled: boolean;
  updatedAt: string;
}

export const SHARED_SCOPE_KEY = '_shared';

export interface DailyTimelineRecord {
  date: string;
  courses: string[];
  items: Record<string, Record<string, TimelineItemState>>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTimelineItemInput {
  date: string;
  itemKey: string;
  scope: string;
  value?: string;
  note?: string;
  autoFilled?: boolean;
}

export interface DayFlags {
  hasLogMismatch: boolean;
  hasSpotCheckFinding: boolean;
}
