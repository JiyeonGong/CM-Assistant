export interface SavedQuickMessages {
  morningGreeting?: string;
  eveningGreeting?: string;
  instructorAttendanceShare?: string;
  instructorMorningAttendanceShare?: string;
  instructorAfternoonAttendanceShare?: string;
}

export interface MemoTemplate {
  id: string;
  title: string;
  content: string;
}

export interface CreateMemoTemplateInput {
  title: string;
  content: string;
}
