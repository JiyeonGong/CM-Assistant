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
  outingStart?: number;
  outingEnd?: number;
  requestStatus?: number;
  requestAttendanceStatus?: number;
  requestReason?: number;
}

interface AttendanceLayout {
  startRow: number;
  columns: AttendanceColumnMap;
}

interface HeaderColumn {
  index: number;
  parent: string;
  current: string;
  combined: string;
}

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

  const layout = getWorkbookAttendanceLayout(worksheet);

  return analyzeAttendanceRows({
    cohortName,
    sourceFileName: basename(filePath),
    rowCount: worksheet.rowCount,
    startRow: layout.startRow,
    columns: layout.columns,
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
    const outingTime = formatTimeRange(
      getOptionalCellValue(getCellValue, rowNumber, columns.outingStart),
      getOptionalCellValue(getCellValue, rowNumber, columns.outingEnd)
    );
    const requestStatus = normalizeText(getOptionalCellValue(getCellValue, rowNumber, columns.requestStatus));
    const requestAttendanceStatus = normalizeText(getOptionalCellValue(getCellValue, rowNumber, columns.requestAttendanceStatus));
    const requestReason = normalizeText(getOptionalCellValue(getCellValue, rowNumber, columns.requestReason));
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

    if (!isAbsent && !isOfficialLeave && (attendanceStatus === '외출' || Boolean(outingTime))) {
      outingPeople.push({
        name,
        time: outingTime,
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

function getWorkbookAttendanceLayout(worksheet: ExcelJS.Worksheet): AttendanceLayout {
  return getAttendanceLayout({
    rowCount: worksheet.rowCount,
    maxColumnCount: worksheet.columnCount,
    sourceLabel: '엑셀 파일',
    getCellValue: (rowIndex, cellIndex) => worksheet.getRow(rowIndex).getCell(cellIndex).value
  });
}

function getPastedAttendanceLayout(rows: string[][]): AttendanceLayout {
  if (rows.length < 3) {
    throw new Error('붙여넣은 표에서 출석부 데이터를 찾지 못했습니다. 헤더를 포함해 표 전체를 복사해주세요.');
  }

  return getAttendanceLayout({
    rowCount: rows.length,
    maxColumnCount: Math.max(...rows.map((row) => row.length)),
    sourceLabel: '붙여넣은 표',
    getCellValue: (rowIndex, cellIndex) => rows[rowIndex - 1]?.[cellIndex - 1]
  });
}

function getAttendanceLayout({
  rowCount,
  maxColumnCount,
  sourceLabel,
  getCellValue
}: {
  rowCount: number;
  maxColumnCount: number;
  sourceLabel: string;
  getCellValue: AttendanceRowReader;
}): AttendanceLayout {
  const headerRow = findAttendanceHeaderRow(rowCount, maxColumnCount, getCellValue);
  if (!headerRow) {
    throw new Error(`${sourceLabel}에서 성명/출결상태 헤더를 찾지 못했습니다. 오늘 HRD 출석부 전체를 사용했는지 확인해주세요.`);
  }

  const columns = getAttendanceColumns(headerRow.columns, sourceLabel);
  const startRow = findAttendanceStartRow(rowCount, headerRow.rowNumber, columns, getCellValue);

  return { startRow, columns };
}

function findAttendanceHeaderRow(
  rowCount: number,
  maxColumnCount: number,
  getCellValue: AttendanceRowReader
): { rowNumber: number; columns: HeaderColumn[] } | null {
  let bestHeader: { rowNumber: number; columns: HeaderColumn[]; score: number } | null = null;

  for (let rowNumber = 1; rowNumber <= Math.min(10, rowCount); rowNumber += 1) {
    const columns = getHeaderColumns(rowNumber, maxColumnCount, getCellValue);
    const score = scoreHeaderColumns(columns);
    if (score >= (bestHeader?.score ?? 0)) {
      bestHeader = { rowNumber, columns, score };
    }
  }

  return bestHeader && bestHeader.score >= 4
    ? { rowNumber: bestHeader.rowNumber, columns: bestHeader.columns }
    : null;
}

function getHeaderColumns(rowNumber: number, maxColumnCount: number, getCellValue: AttendanceRowReader): HeaderColumn[] {
  return Array.from({ length: maxColumnCount }, (_value, index) => {
    const columnIndex = index + 1;
    const parent = normalizeText(rowNumber > 1 ? getCellValue(rowNumber - 1, columnIndex) : '');
    const current = normalizeText(getCellValue(rowNumber, columnIndex));
    return {
      index: columnIndex,
      parent,
      current,
      combined: [parent, current].filter(Boolean).join(' ')
    };
  });
}

function scoreHeaderColumns(columns: HeaderColumn[]): number {
  return [
    findColumn(columns, isNameHeader),
    findColumn(columns, isTraineeStatusHeader),
    findColumn(columns, isAttendanceStatusHeader),
    findColumn(columns, isEntryTimeHeader),
    findColumn(columns, isExitTimeHeader),
    findColumn(columns, isRequestStatusHeader),
    findColumn(columns, isRequestAttendanceStatusHeader),
    findColumn(columns, isRequestReasonHeader)
  ].filter(Boolean).length;
}

function getAttendanceColumns(headerColumns: HeaderColumn[], sourceLabel: string): AttendanceColumnMap {
  const columns: AttendanceColumnMap = {
    name: requireColumn(headerColumns, isNameHeader, sourceLabel, '성명'),
    traineeStatus: requireColumn(headerColumns, isTraineeStatusHeader, sourceLabel, '훈련생 상태'),
    attendanceStatus: requireColumn(headerColumns, isAttendanceStatusHeader, sourceLabel, '출결상태'),
    entryTime: requireColumn(headerColumns, isEntryTimeHeader, sourceLabel, '입실 시간'),
    exitTime: requireColumn(headerColumns, isExitTimeHeader, sourceLabel, '퇴실 시간'),
    outingStart: findColumn(headerColumns, isOutingStartHeader),
    outingEnd: findColumn(headerColumns, isOutingEndHeader),
    requestStatus: findColumn(headerColumns, isRequestStatusHeader),
    requestAttendanceStatus: findColumn(headerColumns, isRequestAttendanceStatusHeader),
    requestReason: findColumn(headerColumns, isRequestReasonHeader)
  };

  return columns;
}

function requireColumn(
  columns: HeaderColumn[],
  predicate: (column: HeaderColumn) => boolean,
  sourceLabel: string,
  label: string
): number {
  const columnIndex = findColumn(columns, predicate);
  if (!columnIndex) {
    throw new Error(`${sourceLabel}에서 ${label} 열을 찾지 못했습니다. HRD 출석부의 헤더를 포함해 다시 시도해주세요.`);
  }
  return columnIndex;
}

function findColumn(columns: HeaderColumn[], predicate: (column: HeaderColumn) => boolean): number | undefined {
  return columns.find(predicate)?.index;
}

function findAttendanceStartRow(
  rowCount: number,
  headerRowNumber: number,
  columns: AttendanceColumnMap,
  getCellValue: AttendanceRowReader
): number {
  for (let rowNumber = headerRowNumber + 1; rowNumber <= rowCount; rowNumber += 1) {
    const name = normalizeText(getCellValue(rowNumber, columns.name));
    const traineeStatus = normalizeText(getCellValue(rowNumber, columns.traineeStatus));
    if (name && traineeStatus === ACTIVE_TRAINEE_STATUS) {
      return rowNumber;
    }
  }

  return headerRowNumber + 1;
}

function getOptionalCellValue(getCellValue: AttendanceRowReader, rowNumber: number, cellIndex: number | undefined): unknown {
  return cellIndex ? getCellValue(rowNumber, cellIndex) : undefined;
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

function compactHeader(value: string): string {
  return removeWhitespace(value).toLowerCase();
}

function isRequestHeader(column: HeaderColumn): boolean {
  return compactHeader(column.parent).includes('출석입력요청') || compactHeader(column.current).includes('출석입력요청');
}

function isNameHeader(column: HeaderColumn): boolean {
  return compactHeader(column.current).includes('성명') || compactHeader(column.current).includes('이름');
}

function isTraineeStatusHeader(column: HeaderColumn): boolean {
  const current = compactHeader(column.current);
  const combined = compactHeader(column.combined);
  return !isRequestHeader(column) && (current === '상태' || combined.includes('훈련생상태') || combined.includes('수강생상태'));
}

function isAttendanceStatusHeader(column: HeaderColumn): boolean {
  return !isRequestHeader(column) && compactHeader(column.current).includes('출결상태');
}

function isEntryTimeHeader(column: HeaderColumn): boolean {
  const current = compactHeader(column.current);
  return current.includes('입실') || current.includes('입실시간') || current.includes('입실시각');
}

function isExitTimeHeader(column: HeaderColumn): boolean {
  const current = compactHeader(column.current);
  return current.includes('퇴실') || current.includes('퇴실시간') || current.includes('퇴실시각');
}

function isOutingStartHeader(column: HeaderColumn): boolean {
  const current = compactHeader(column.current);
  const combined = compactHeader(column.combined);
  return combined.includes('외출') && (current.includes('시작') || current.includes('외출시작'));
}

function isOutingEndHeader(column: HeaderColumn): boolean {
  const current = compactHeader(column.current);
  const combined = compactHeader(column.combined);
  return combined.includes('외출') && (current.includes('복귀') || current.includes('종료') || current.includes('외출복귀'));
}

function isRequestStatusHeader(column: HeaderColumn): boolean {
  return isRequestHeader(column) && compactHeader(column.current).includes('처리상태');
}

function isRequestAttendanceStatusHeader(column: HeaderColumn): boolean {
  return isRequestHeader(column) && compactHeader(column.current).includes('출결상태');
}

function isRequestReasonHeader(column: HeaderColumn): boolean {
  return isRequestHeader(column) && compactHeader(column.current).includes('사유');
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
