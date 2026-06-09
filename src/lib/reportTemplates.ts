import type { AttendanceSummary, PersonNote, PersonTimeNote } from '../types/attendance';

export function generateMorningAttendanceTemplate(cohortName: string, date = new Date()): string {
  const { dateText, dayOfWeek } = formatReportDate(date);

  return [
    `*[${cohortName}] ${dateText}(${dayOfWeek}) 오전 출결 현황 공유*`,
    '- *출석:* 00명 (전체: 00명)',
    '- *지각/미입실:* 00명',
    '- *휴공가:* 00명',
    '- *결석:* 00명'
  ].join('\n');
}

export function generateAfternoonAttendanceTemplate(cohortName: string, date = new Date()): string {
  const { dateText, dayOfWeek } = formatReportDate(date);

  return [
    `*[${cohortName}] ${dateText}일(${dayOfWeek}) 오후 출결 현황 공유*`,
    '- *Zep 접속자:* 00명',
    '- *외출:* 00명',
    '- *추가 휴공가:* 00명',
    '- *결석:* 00명'
  ].join('\n');
}

export function generateFinalAttendanceTemplate(cohortName: string, date = new Date()): string {
  const { dateText, dayOfWeek } = formatReportDate(date);

  return [
    `*[${cohortName}] ${dateText}(${dayOfWeek}) 최종 확정 출결 공유*`,
    '- *출석:* 00명(전체 00명)',
    '- *퇴실 QR 미촬영:* 00명',
    '- *지각/외출/조퇴:* 00명',
    '',
    '- *결석:* 00명',
    '',
    '- *출석입력요청 검토 결과*',
    '  - *검토 대상:* 00건',
    '  - *검토 결과:* -'
  ].join('\n');
}

export function generateMorningAttendanceReport(summary: AttendanceSummary): string {
  const lateOrMissingPeople = [...summary.missingEntryPeople, ...summary.latePeople];
  const missingEntryNames = new Set(summary.missingEntryPeople.map((person) => person.name));
  const morningAbsentPeople = summary.absentPeople.filter((person) => !missingEntryNames.has(person.name));
  const morningPresentCount = Math.max(summary.totalCount - lateOrMissingPeople.length, 0);

  return [
    `*[${summary.cohortName}] ${summary.date}(${summary.dayOfWeek}) 오전 출결 현황 공유*`,
    `- *출석:* ${morningPresentCount}명 (전체: ${summary.totalCount}명)`,
    `- *지각/미입실:* ${lateOrMissingPeople.length}명`,
    formatNestedPeopleLines(lateOrMissingPeople),
    `- *휴공가:* ${summary.officialLeaveCount}명${formatOfficialLeaveInline(summary.officialLeavePeople)}`,
    `- *결석:* ${morningAbsentPeople.length}명${formatPeopleInline(morningAbsentPeople)}`
  ]
    .filter(Boolean)
    .join('\n');
}

export function generateAfternoonAttendanceReport(summary: AttendanceSummary): string {
  const zepConnectionCount = Math.max(summary.totalCount - summary.qrMissingCount, 0);

  return [
    `*[${summary.cohortName}] ${summary.date}일(${summary.dayOfWeek}) 오후 출결 현황 공유*`,
    `- *Zep 접속자:* ${zepConnectionCount}명`,
    `- *외출:* ${summary.outingCount}명${formatPeopleInline(summary.outingPeople)}`,
    `- *추가 휴공가:* ${summary.officialLeaveCount}명`,
    `- *결석:* ${summary.absentCount}명${formatPeopleInline(summary.absentPeople)}`
  ].join('\n');
}

export function generateFinalAttendanceReport(summary: AttendanceSummary): string {
  const exceptionCount = summary.lateCount + summary.outingCount + summary.earlyLeaveCount;
  const exceptionPeople = [...summary.latePeople, ...summary.outingPeople, ...summary.earlyLeavePeople];

  return [
    `*[${summary.cohortName}] ${summary.date}(${summary.dayOfWeek}) 최종 확정 출결 공유*`,
    `- *출석:* ${summary.presentCount}명(전체 ${summary.totalCount}명)`,
    `- *퇴실 QR 미촬영:* ${summary.qrMissingCount}명${formatPeopleInline(summary.qrMissingPeople)}`,
    `- *지각/외출/조퇴:* ${exceptionCount}명`,
    formatNestedPeopleLines(exceptionPeople),
    '',
    `- *결석:* ${summary.absentCount}명`,
    formatNestedPeopleLines(summary.absentPeople),
    '',
    '- *출석입력요청 검토 결과*',
    `  - *검토 대상:* ${summary.reviewRequestCount}건`,
    `  - *검토 결과:* ${summary.reviewResultText}`
  ].join('\n');
}

export function generateSpotCheckReport(summary: AttendanceSummary, currentTime: string): string {
  const exceptionCount = summary.lateCount + summary.outingCount + summary.earlyLeaveCount;

  return `[${summary.cohortName}] ${summary.date}(${summary.dayOfWeek}) ${currentTime} 불시점검 현황 공유

- 현재 출석 인원: ${summary.presentCount}명
- 이탈/미확인 인원: ${summary.qrMissingCount}명${formatPeopleInline(summary.qrMissingPeople)}
- 지각/외출/조퇴 현황: ${exceptionCount}명
 - 외출 : ${summary.outingCount}명${formatPeopleInline(summary.outingPeople)}
 - 지각 : ${summary.lateCount}명${formatPeopleInline(summary.latePeople)}
 - 조퇴 : ${summary.earlyLeaveCount}명${formatPeopleInline(summary.earlyLeavePeople)}

- 특이사항: 없음
- 조치사항: 없음`;
}

function formatPeopleInline(people: Array<PersonNote | PersonTimeNote>): string {
  if (people.length === 0) {
    return '';
  }

  const text = people
    .map((person) => {
      const time = 'time' in person && person.time ? ` ${person.time}` : '';
      const note = person.note ? ` ${person.note}` : '';
      return `${person.name}${time}${note}`;
    })
    .join(', ');

  return `(${text})`;
}

function formatOfficialLeaveInline(people: PersonNote[]): string {
  if (people.length === 0) {
    return '';
  }

  return `(${people.map((person) => `${person.name}${person.note ? ` - ${person.note}` : ''}`).join(', ')})`;
}

function formatPeopleLines(people: Array<PersonNote | PersonTimeNote>): string {
  if (people.length === 0) {
    return '';
  }

  return people
    .map((person) => {
      const time = 'time' in person && person.time ? ` ${person.time}` : '';
      const detail = [person.note, time.trim()].filter(Boolean).join(' ');
      return detail ? `${person.name}(${detail})` : person.name;
    })
    .join('\n');
}

function formatNestedPeopleLines(people: Array<PersonNote | PersonTimeNote>): string {
  const lines = formatPeopleLines(people);
  if (!lines) {
    return '';
  }

  return lines
    .split('\n')
    .map((line) => `  - ${line}`)
    .join('\n');
}

function formatReportDate(date: Date): { dateText: string; dayOfWeek: string } {
  return {
    dateText: `${date.getMonth() + 1}/${date.getDate()}`,
    dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  };
}
