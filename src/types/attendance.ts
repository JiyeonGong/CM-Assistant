export interface PersonNote {
  name: string;
  note?: string;
}

export interface PersonTimeNote {
  name: string;
  time?: string;
  note?: string;
}

export interface AttendanceSummary {
  cohortName: string;
  date: string;
  dayOfWeek: string;
  totalCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  outingCount: number;
  earlyLeaveCount: number;
  officialLeaveCount: number;
  missingEntryCount: number;
  qrMissingCount: number;
  attendanceRate: number;
  qrMissingPeople: PersonNote[];
  outingPeople: PersonTimeNote[];
  latePeople: PersonTimeNote[];
  earlyLeavePeople: PersonTimeNote[];
  officialLeavePeople: PersonNote[];
  missingEntryPeople: PersonNote[];
  absentPeople: PersonNote[];
  reviewRequestCount: number;
  reviewResultText: string;
  sourceFileName: string;
}
