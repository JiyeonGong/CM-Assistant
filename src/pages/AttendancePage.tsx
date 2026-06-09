import { useState } from 'react';
import {
  generateAfternoonAttendanceReport,
  generateAfternoonAttendanceTemplate,
  generateFinalAttendanceReport,
  generateFinalAttendanceTemplate,
  generateMorningAttendanceReport,
  generateMorningAttendanceTemplate
} from '../lib/reportTemplates';
import { convertSlackMarkdownToClipboardHtml } from '../lib/slackClipboard';
import type { AttendanceSummary } from '../types/attendance';

type MessageType = 'info' | 'error' | 'success';
type AttendanceInputMode = 'file' | 'paste';

interface UiMessage {
  type: MessageType;
  text: string;
}

const DEFAULT_COHORT_NAME = 'PD_8기';

export default function AttendancePage() {
  const [cohortName, setCohortName] = useState(DEFAULT_COHORT_NAME);
  const [inputMode, setInputMode] = useState<AttendanceInputMode>('file');
  const [filePath, setFilePath] = useState('');
  const [pastedTableText, setPastedTableText] = useState('');
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [generatedReport, setGeneratedReport] = useState('');
  const [message, setMessage] = useState<UiMessage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function handleSelectFile(): Promise<void> {
    setMessage(null);
    const selectedPath = await window.cmAssistant.selectExcelFile();
    if (!selectedPath) return;

    setFilePath(selectedPath);
    setSummary(null);
    setGeneratedReport('');
  }

  async function handleAnalyze(): Promise<void> {
    if (inputMode === 'file' && !filePath) {
      setMessage({ type: 'error', text: '먼저 단위기간 출석부 엑셀 파일을 선택해주세요.' });
      return;
    }

    if (inputMode === 'paste' && !pastedTableText.trim()) {
      setMessage({ type: 'error', text: '먼저 엑셀 표를 붙여넣어 주세요.' });
      return;
    }

    setIsAnalyzing(true);
    setMessage(null);

    try {
      const trimmedCohortName = cohortName.trim() || DEFAULT_COHORT_NAME;
      const result =
        inputMode === 'file'
          ? await window.cmAssistant.analyzeAttendance(filePath, trimmedCohortName)
          : await window.cmAssistant.analyzePastedAttendance(pastedTableText, trimmedCohortName);
      setSummary(result);
      setGeneratedReport(generateMorningAttendanceReport(result));
      setMessage({ type: 'success', text: '출결 분석이 완료되어 오전 보고 멘트를 자동 생성했습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.' });
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleGenerateMorningReport(): void {
    const trimmedCohortName = cohortName.trim() || DEFAULT_COHORT_NAME;
    setGeneratedReport(summary ? generateMorningAttendanceReport({ ...summary, cohortName: trimmedCohortName }) : generateMorningAttendanceTemplate(trimmedCohortName));
    setMessage({ type: 'info', text: summary ? '오전 출결 보고 멘트를 생성했습니다.' : '오전 출결 보고 기본 양식을 생성했습니다.' });
  }

  function handleGenerateAfternoonReport(): void {
    const trimmedCohortName = cohortName.trim() || DEFAULT_COHORT_NAME;
    setGeneratedReport(summary ? generateAfternoonAttendanceReport({ ...summary, cohortName: trimmedCohortName }) : generateAfternoonAttendanceTemplate(trimmedCohortName));
    setMessage({ type: 'info', text: summary ? '오후 출결 보고 멘트를 생성했습니다.' : '오후 출결 보고 기본 양식을 생성했습니다.' });
  }

  function handleGenerateFinalReport(): void {
    const trimmedCohortName = cohortName.trim() || DEFAULT_COHORT_NAME;
    setGeneratedReport(summary ? generateFinalAttendanceReport({ ...summary, cohortName: trimmedCohortName }) : generateFinalAttendanceTemplate(trimmedCohortName));
    setMessage({ type: 'info', text: summary ? '최종 확정 출결 보고 멘트를 생성했습니다.' : '최종 확정 출결 보고 기본 양식을 생성했습니다.' });
  }

  function handleCopy(): void {
    if (!generatedReport) {
      setMessage({ type: 'error', text: '복사할 멘트가 없습니다.' });
      return;
    }

    window.cmAssistant.copyReport(generatedReport, convertSlackMarkdownToClipboardHtml(generatedReport));
    setMessage({ type: 'success', text: '복사되었습니다. Slack에 붙여넣으면 볼드 서식이 함께 적용됩니다.' });
  }

  return (
    <>
      <section className="hero-card compact-hero simple-hero">
        <div>
          <p className="eyebrow">Attendance</p>
          <h1>출결을 확인하고 바로 공유해요</h1>
          <p className="hero-copy">출석부 입력, 분석 결과 확인, 보고 멘트 복사까지 한 흐름으로 처리합니다.</p>
        </div>
        <div className="privacy-badge">개인정보 서버 전송 없음</div>
      </section>

      <section className="panel input-panel">
        <div className="section-heading step-heading">
          <p className="eyebrow">Step 1</p>
          <h2>출석부 넣기</h2>
          <p>엑셀 파일을 불러오거나 표를 붙여넣은 뒤 분석합니다.</p>
        </div>

        <div className="attendance-input-grid">
          <label className="field-label" htmlFor="cohortName">기수명</label>
          <input id="cohortName" className="text-input" value={cohortName} onChange={(event) => setCohortName(event.target.value)} placeholder="예: PD_8기" />

          <div className="input-mode-row">
            <button type="button" className={inputMode === 'file' ? 'mode-button active' : 'mode-button'} onClick={() => setInputMode('file')}>파일 선택</button>
            <button type="button" className={inputMode === 'paste' ? 'mode-button active' : 'mode-button'} onClick={() => setInputMode('paste')}>표 붙여넣기</button>
          </div>

          {inputMode === 'file' ? (
            <div className="file-row">
              <button type="button" className="primary-button" onClick={handleSelectFile}>출석부 불러오기</button>
              <div className="file-info">
                <span>선택된 파일</span>
                <strong>{filePath ? getFileName(filePath) : '없음'}</strong>
              </div>
            </div>
          ) : (
            <textarea
              className="paste-input"
              value={pastedTableText}
              onChange={(event) => setPastedTableText(event.target.value)}
              placeholder="엑셀에서 단위기간 출석부 표 전체를 복사한 뒤 여기에 붙여넣어 주세요."
            />
          )}

          <button type="button" className="accent-button" onClick={handleAnalyze} disabled={isAnalyzing}>{isAnalyzing ? '분석 중...' : '분석하기'}</button>
          {message && <p className={`status-message ${message.type}`}>{message.text}</p>}
        </div>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">Step 2</p>
            <h2>결과 확인</h2>
            <p>보고 전에 이상 인원과 QR 미촬영자를 확인합니다.</p>
          </div>
          {summary ? <SummaryCard summary={summary} /> : <EmptyState text="출석부를 선택한 뒤 분석을 실행해주세요." />}
        </section>

        <section className="panel report-panel">
          <div className="section-heading">
            <p className="eyebrow">Step 3</p>
            <h2>보고 복사</h2>
            <p>출석부가 없어도 기본 양식을 만들고 바로 복사할 수 있습니다.</p>
          </div>
          <div className="button-row three-columns">
            <button type="button" className="primary-button" onClick={handleGenerateMorningReport}>오전 보고</button>
            <button type="button" className="secondary-button" onClick={handleGenerateAfternoonReport}>오후 보고</button>
            <button type="button" className="secondary-button" onClick={handleGenerateFinalReport}>최종 보고</button>
          </div>
          <textarea className="report-output" value={generatedReport} readOnly placeholder="생성된 Slack 문구가 여기에 표시됩니다." />
          <button type="button" className="copy-button" onClick={handleCopy}>복사하기</button>
        </section>
      </section>
    </>
  );
}

function SummaryCard({ summary }: { summary: AttendanceSummary }) {
  const items = [
    ['전체 인원', `${summary.totalCount}명`],
    ['출석', `${summary.presentCount}명`],
    ['지각', `${summary.lateCount}명`],
    ['외출', `${summary.outingCount}명`],
    ['조퇴', `${summary.earlyLeaveCount}명`],
    ['휴공가', `${summary.officialLeaveCount}명`],
    ['미입실', `${summary.missingEntryCount}명`],
    ['결석', `${summary.absentCount}명`],
    ['퇴실 QR 미촬영', `${summary.qrMissingCount}명`],
    ['출석률', `${summary.attendanceRate.toFixed(1)}%`]
  ];

  return (
    <div>
      <div className="summary-meta">
        <span>{summary.sourceFileName}</span>
        <span>{summary.date}({summary.dayOfWeek})</span>
      </div>
      <div className="summary-grid">
        {items.map(([label, value]) => (
          <div className="summary-item" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="detail-list">
        <DetailLine label="외출" people={summary.outingPeople} />
        <DetailLine label="지각" people={summary.latePeople} />
        <DetailLine label="미입실" people={summary.missingEntryPeople} />
        <DetailLine label="조퇴" people={summary.earlyLeavePeople} />
        <DetailLine label="휴공가" people={summary.officialLeavePeople} />
        <DetailLine label="결석" people={summary.absentPeople} />
      </div>
    </div>
  );
}

function DetailLine({ label, people }: { label: string; people: Array<{ name: string; time?: string; note?: string }> }) {
  return (
    <p>
      <strong>{label}</strong>
      <span>{people.length > 0 ? people.map((person) => `${person.name}${person.time ? ` ${person.time}` : ''}`).join(', ') : '없음'}</span>
    </p>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function getFileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}
