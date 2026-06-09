import ExcelJS from 'exceljs';
import { basename } from 'node:path';
import type { AttendanceSummary, PersonNote, PersonTimeNote } from '../../src/types/attendance';

const ACTIVE_TRAINEE_STATUS = '훈련중';
const PRESENT_STATUSES = new Set(['출석', '지각', '외출', '조퇴']);
const QR_REQUIRED_STATUSES = new Set(['출석', '지각', '외출']);
const LATE_START_TIME = '09:11';
const EARLY_LEAVE_CUTOFF_TIME = '18:50';

type AttendanceRowReader = (rowIndex: number, cellIndex: number) => unknown;

interface AttendanceColumnMap {
  name: number;
  traineeStatus: number;
  attendanceStatus: number;
  entryTime: number;
  exitTime: number;
  outingStart: number;
  outingEnd: number;
  requestStatus: number;
  requestAttendanceStatus: number;
  requestReason: number;
}

const DEFAULT_COLUMNS: AttendanceColumnMap = {
  name: 2,
  traineeStatus: 6,
  attendanceStatus: 7,
  entryTime: 8,
  exitTime: 9,
  outingStart: 10,
  outingEnd: 11,
  requestStatus: 12,
  requestAttendanceStatus: 13,
  requestReason: 14
};

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

  return analyzeAttendanceRows({
    cohortName,
    sourceFileName: basename(filePath),
    rowCount: worksheet.rowCount,
    startRow: 3,
    columns: DEFAULT_COLUMNS,
    getCellValue: (rowIndex, cellIndex) => worksheet.getRow(rowIndex).getCell(cellIndex).value
  });
}

export function analyzeAttendancePastedTable(pastedText: string, cohortName: string): AttendanceSummary {
  const rows = parsePastedTable(pastedText);
  const layout = getPastedAttendanceLayout(rows);

  return analyzeAttendanceRows({
    cohortName,
    sourceFileName: '붙여넣은 출석부',
    rowCount: rows.length,
    startRow: layout.startRow,
    columns: layout.columns,
    getCellValue: (rowIndex, cellIndex) => rows[rowIndex - 1]?.[cellIndex - 1]
  });
}

function analyzeAttendanceRows({
  cohortName,
  sourceFileName,
  rowCount,
  startRow,
  columns,
  getCellValue
}: {
  cohortName: string;
  sourceFileName: string;
  rowCount: number;
  startRow: number;
  columns: AttendanceColumnMap;
  getCellValue: AttendanceRowReader;
}): AttendanceSummary {

  const absentPeople: PersonNote[] = [];
  const latePeople: PersonTimeNote[] = [];
  const outingPeople: PersonTimeNote[] = [];
  const earlyLeavePeople: PersonTimeNote[] = [];
  const officialLeavePeople: PersonNote[] = [];
  const missingEntryPeople: PersonNote[] = [];
  const qrMissingPeople: PersonNote[] = [];

  let totalCount = 0;
  let presentCount = 0;
  let reviewRequestCount = 0;
  const reviewNotes: string[] = [];

  for (let rowNumber = startRow; rowNumber <= rowCount; rowNumber += 1) {
    const name = normalizeText(getCellValue(rowNumber, columns.name));
    const traineeStatus = normalizeText(getCellValue(rowNumber, columns.traineeStatus));
    const attendanceStatus = normalizeText(getCellValue(rowNumber, columns.attendanceStatus));
    const entryTime = formatExcelTime(getCellValue(rowNumber, columns.entryTime));
    const exitTime = formatExcelTime(getCellValue(rowNumber, columns.exitTime));
    const requestStatus = normalizeText(getCellValue(rowNumber, columns.requestStatus));
    const requestAttendanceStatus = normalizeText(getCellValue(rowNumber, columns.requestAttendanceStatus));
    const requestReason = normalizeText(getCellValue(rowNumber, columns.requestReason));
    const isApprovedOfficialLeaveRequest = requestStatus.includes('신청') && isOfficialLeaveStatus(requestAttendanceStatus);
    const officialLeaveNote = isApprovedOfficialLeaveRequest
      ? formatOfficialLeaveRequestNote(requestAttendanceStatus, requestReason)
      : attendanceStatus;
    const isUnderHalfAttendance = isUnderHalfStatus(attendanceStatus) && !isApprovedOfficialLeaveRequest;
    const isAbsent = !isApprovedOfficialLeaveRequest && (attendanceStatus === '결석' || isUnderHalfAttendance);
    const isOfficialLeave = isOfficialLeaveStatus(attendanceStatus) || isApprovedOfficialLeaveRequest;

    if (!name || traineeStatus !== ACTIVE_TRAINEE_STATUS) {
      continue;
    }

    totalCount += 1;

    if ((PRESENT_STATUSES.has(attendanceStatus) && !isUnderHalfAttendance) || isApprovedOfficialLeaveRequest) {
      presentCount += 1;
    }

    if (!entryTime && !isOfficialLeave && !isUnderHalfAttendance) {
      missingEntryPeople.push({ name, note: '부재중' });
    }

    if (QR_REQUIRED_STATUSES.has(attendanceStatus) && !isUnderHalfAttendance && !isOfficialLeave && !exitTime) {
      qrMissingPeople.push({ name });
    }

    if (isAbsent) {
      absentPeople.push({ name, note: isUnderHalfAttendance ? '100분의50미만' : undefined });
    } else if (!isOfficialLeave && (attendanceStatus === '지각' || isAtOrAfterTime(entryTime, LATE_START_TIME))) {
      latePeople.push({ name, time: entryTime, note: '지각' });
    }

    if (!isAbsent && !isOfficialLeave && attendanceStatus === '외출') {
      outingPeople.push({
        name,
        time: formatTimeRange(getCellValue(rowNumber, columns.outingStart), getCellValue(rowNumber, columns.outingEnd)),
        note: '외출'
      });
    }

    if (!isAbsent && !isOfficialLeave && (attendanceStatus === '조퇴' || isBeforeTime(exitTime, EARLY_LEAVE_CUTOFF_TIME))) {
      earlyLeavePeople.push({ name, time: exitTime, note: '조퇴' });
    }

    if (isOfficialLeave) {
      officialLeavePeople.push({ name, note: officialLeaveNote });
    }

    if (requestStatus && requestStatus !== '-' && !isApprovedOfficialLeaveRequest) {
      reviewRequestCount += 1;
      reviewNotes.push(
        [name, requestStatus, requestAttendanceStatus, requestReason].filter((value) => value && value !== '-').join(' ')
      );
    }
  }

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
    qrMissingCount: qrMissingPeople.length,
    attendanceRate,
    qrMissingPeople,
    outingPeople,
    latePeople,
    earlyLeavePeople,
    officialLeavePeople,
    missingEntryPeople,
    absentPeople,
    reviewRequestCount,
    reviewResultText: reviewNotes.length > 0 ? reviewNotes.join(' / ') : '이상 없음',
    sourceFileName
  };
}

function validateDailyAttendanceSheet(worksheet: ExcelJS.Worksheet): void {
  const requiredHeaders = ['성명'];
  const headerText = Array.from({ length: Math.min(10, worksheet.rowCount) }, (_value, index) => index + 1)
    .flatMap((rowNumber) => {
      const values: string[] = [];
      worksheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell) => {
        values.push(normalizeText(cell.value));
      });
      return values;
    })
    .join(' ');
  const compactHeaderText = removeWhitespace(headerText);

  const missingHeaders = requiredHeaders.filter((header) => !compactHeaderText.includes(removeWhitespace(header)));
  if (missingHeaders.length > 0) {
    throw new Error(`단위기간 출석부 필수 헤더를 찾지 못했습니다: ${missingHeaders.join(', ')}`);
  }
}

function getPastedAttendanceLayout(rows: string[][]): { startRow: number; columns: AttendanceColumnMap } {
  if (rows.length < 3) {
    throw new Error('붙여넣은 표에서 출석부 데이터를 찾지 못했습니다. 헤더를 포함해 표 전체를 복사해주세요.');
  }

  const headerRowIndex = rows.findIndex((row) => {
    const normalizedCells = row.map(normalizeText);
    return normalizedCells.some((cell) => cell.includes('성명')) && normalizedCells.some((cell) => cell.includes('출결상태'));
  });

  if (headerRowIndex === -1) {
    throw new Error('붙여넣은 표에서 성명/출결상태 헤더를 찾지 못했습니다. 오늘 HRD 출석부 전체를 복사했는지 확인해주세요.');
  }

  const headerRow = rows[headerRowIndex].map(normalizeText);
  const nameColumn = headerRow.findIndex((cell) => cell.includes('성명')) + 1;

  if (nameColumn <= 0) {
    throw new Error('붙여넣은 표에서 성명 열을 찾지 못했습니다.');
  }

  const columns: AttendanceColumnMap = {
    name: nameColumn,
    traineeStatus: nameColumn + 4,
    attendanceStatus: nameColumn + 5,
    entryTime: nameColumn + 6,
    exitTime: nameColumn + 7,
    outingStart: nameColumn + 8,
    outingEnd: nameColumn + 9,
    requestStatus: nameColumn + 10,
    requestAttendanceStatus: nameColumn + 11,
    requestReason: nameColumn + 12
  };

  const startRowIndex = rows.findIndex((row, index) => {
    if (index <= headerRowIndex) return false;
    const name = normalizeText(row[columns.name - 1]);
    const traineeStatus = normalizeText(row[columns.traineeStatus - 1]);
    return Boolean(name) && (traineeStatus === ACTIVE_TRAINEE_STATUS || traineeStatus === '중도탈락');
  });

  return {
    startRow: startRowIndex === -1 ? headerRowIndex + 3 : startRowIndex + 1,
    columns
  };
}

function parsePastedTable(pastedText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let isQuoted = false;
  const text = pastedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (isQuoted && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
      continue;
    }

    if (char === '\t' && !isQuoted) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if (char === '\n' && !isQuoted) {
      row.push(cell.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function normalizeText(value: unknown): string {
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

function removeWhitespace(value: string): string {
  return value.replace(/\s+/g, '');
}

function isOfficialLeaveStatus(status: string): boolean {
  return status.includes('휴가') || status.includes('공가') || status.includes('휴공가');
}

function formatOfficialLeaveRequestNote(status: string, reason: string): string {
  if (status === '휴가') {
    return status;
  }

  return [status, reason].filter((value) => value && value !== '-').join(' - ');
}

function isUnderHalfStatus(status: string): boolean {
  return status.includes('100분의50미만') || status.includes('100분의 50미만') || status.includes('50미만');
}

function formatTimeRange(startValue: unknown, endValue: unknown): string | undefined {
  const start = formatExcelTime(startValue);
  const end = formatExcelTime(endValue);

  if (start && end) {
    return `${start}~${end}`;
  }

  return start || end;
}

function formatExcelTime(value: unknown): string | undefined {
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  }

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

function isAtOrAfterTime(time: string | undefined, threshold: string): boolean {
  const timeMinutes = parseTimeToMinutes(time);
  const thresholdMinutes = parseTimeToMinutes(threshold);
  return timeMinutes !== undefined && thresholdMinutes !== undefined && timeMinutes >= thresholdMinutes;
}

function isBeforeTime(time: string | undefined, threshold: string): boolean {
  const timeMinutes = parseTimeToMinutes(time);
  const thresholdMinutes = parseTimeToMinutes(threshold);
  return timeMinutes !== undefined && thresholdMinutes !== undefined && timeMinutes < thresholdMinutes;
}

function parseTimeToMinutes(time: string | undefined): number | undefined {
  if (!time) {
    return undefined;
  }

  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return undefined;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDayOfWeek(date: Date): string {
  return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
}
