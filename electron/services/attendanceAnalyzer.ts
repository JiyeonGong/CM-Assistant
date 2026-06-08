import ExcelJS from 'exceljs';
import { basename } from 'node:path';
import type { AttendanceSummary, PersonNote, PersonTimeNote } from '../../src/types/attendance';

const ACTIVE_TRAINEE_STATUS = '훈련중';
const PRESENT_STATUSES = new Set(['출석', '지각', '외출', '조퇴']);

export async function analyzeAttendanceWorkbook(filePath: string, cohortName: string): Promise<AttendanceSummary> {
  if (!filePath.toLowerCase().endsWith('.xlsx')) {
    throw new Error('현재 MVP에서는 .xlsx 파일만 지원합니다.');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('엑셀 파일에서 시트를 찾지 못했습니다.');
  }

  validateDailyAttendanceSheet(worksheet);

  const absentPeople: PersonNote[] = [];
  const latePeople: PersonTimeNote[] = [];
  const outingPeople: PersonTimeNote[] = [];
  const earlyLeavePeople: PersonTimeNote[] = [];
  const officialLeavePeople: PersonNote[] = [];
  const missingEntryPeople: PersonNote[] = [];

  let totalCount = 0;
  let presentCount = 0;
  let reviewRequestCount = 0;
  const reviewNotes: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) {
      return;
    }

    const name = normalizeText(row.getCell(2).value);
    const traineeStatus = normalizeText(row.getCell(6).value);
    const attendanceStatus = normalizeText(row.getCell(7).value);
    const entryTime = formatExcelTime(row.getCell(8).value);

    if (!name || traineeStatus !== ACTIVE_TRAINEE_STATUS) {
      return;
    }

    totalCount += 1;

    if (PRESENT_STATUSES.has(attendanceStatus)) {
      presentCount += 1;
    }

    if (!entryTime && !isOfficialLeaveStatus(attendanceStatus)) {
      missingEntryPeople.push({ name, note: '부재중' });
    }

    if (attendanceStatus === '결석') {
      absentPeople.push({ name });
    } else if (attendanceStatus === '지각') {
      latePeople.push({ name, time: entryTime, note: '지각' });
    } else if (attendanceStatus === '외출') {
      outingPeople.push({
        name,
        time: formatTimeRange(row.getCell(10).value, row.getCell(11).value),
        note: '외출'
      });
    } else if (attendanceStatus === '조퇴') {
      earlyLeavePeople.push({ name, time: formatExcelTime(row.getCell(9).value), note: '조퇴' });
    } else if (isOfficialLeaveStatus(attendanceStatus)) {
      officialLeavePeople.push({ name });
    }

    const requestStatus = normalizeText(row.getCell(12).value);
    const requestAttendanceStatus = normalizeText(row.getCell(13).value);
    const requestReason = normalizeText(row.getCell(14).value);

    if (requestStatus && requestStatus !== '-') {
      reviewRequestCount += 1;
      reviewNotes.push(
        [name, requestStatus, requestAttendanceStatus, requestReason].filter((value) => value && value !== '-').join(' ')
      );
    }
  });

  if (totalCount === 0) {
    throw new Error('훈련중 상태의 수강생 데이터를 찾지 못했습니다. 단위기간 출석부 파일인지 확인해주세요.');
  }

  const now = new Date();
  const officialLeaveCount = officialLeavePeople.length;
  const attendanceRate = Math.round((presentCount / totalCount) * 1000) / 10;

  return {
    cohortName,
    date: formatDate(now),
    dayOfWeek: formatDayOfWeek(now),
    totalCount,
    presentCount,
    absentCount: absentPeople.length,
    lateCount: latePeople.length,
    outingCount: outingPeople.length,
    earlyLeaveCount: earlyLeavePeople.length,
    officialLeaveCount,
    missingEntryCount: missingEntryPeople.length,
    qrMissingCount: 0,
    attendanceRate,
    qrMissingPeople: [],
    outingPeople,
    latePeople,
    earlyLeavePeople,
    officialLeavePeople,
    missingEntryPeople,
    absentPeople,
    reviewRequestCount,
    reviewResultText: reviewNotes.length > 0 ? reviewNotes.join(' / ') : '이상 없음',
    sourceFileName: basename(filePath)
  };
}

function validateDailyAttendanceSheet(worksheet: ExcelJS.Worksheet): void {
  const requiredHeaders = ['성명', '상태', '출결상태', '입실', '퇴실', '출석입력요청'];
  const headerText = [1, 2]
    .flatMap((rowNumber) => worksheet.getRow(rowNumber).values as ExcelJS.CellValue[])
    .map(normalizeText)
    .join(' ');

  const missingHeaders = requiredHeaders.filter((header) => !headerText.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`단위기간 출석부 필수 헤더를 찾지 못했습니다: ${missingHeaders.join(', ')}`);
  }
}

function normalizeText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') {
      return value.text.trim();
    }
    if ('result' in value) {
      return normalizeText(value.result as ExcelJS.CellValue);
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join('').trim();
    }
  }

  return String(value).replace(/\s+/g, ' ').trim();
}

function isOfficialLeaveStatus(status: string): boolean {
  return status.includes('휴가') || status.includes('공가') || status.includes('휴공가');
}

function formatTimeRange(startValue: ExcelJS.CellValue, endValue: ExcelJS.CellValue): string | undefined {
  const start = formatExcelTime(startValue);
  const end = formatExcelTime(endValue);

  if (start && end) {
    return `${start}~${end}`;
  }

  return start || end;
}

function formatExcelTime(value: ExcelJS.CellValue): string | undefined {
  const normalized = normalizeText(value);
  if (!normalized || normalized === '-') {
    return undefined;
  }

  const numeric = Number(normalized);
  if (!Number.isNaN(numeric) && numeric >= 0 && numeric < 1) {
    const totalMinutes = Math.round(numeric * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const timeMatch = normalized.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }

  return normalized;
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDayOfWeek(date: Date): string {
  return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
}
