import { useState } from 'react';
import {
  generateAfternoonAttendanceReport,
  generateFinalAttendanceReport,
  generateMorningAttendanceReport
} from '../lib/reportTemplates';
import { convertSlackMarkdownToClipboardHtml } from '../lib/slackClipboard';
import type { AttendanceSummary } from '../types/attendance';

type MessageType = 'info' | 'error' | 'success';

interface UiMessage {
  type: MessageType;
  text: string;
}

const DEFAULT_COHORT_NAME = 'PD_8기';

export default function AttendancePage() {
  const [cohortName, setCohortName] = useState(DEFAULT_COHORT_NAME);
  const [filePath, setFilePath] = useState('');
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
    if (!filePath) {
      setMessage({ type: 'error', text: '먼저 단위기간 출석부 엑셀 파일을 선택해주세요.' });
      return;
    }

    setIsAnalyzing(true);
    setMessage(null);

    try {
      const result = await window.cmAssistant.analyzeAttendance(filePath, cohortName.trim() || DEFAULT_COHORT_NAME);
      setSummary(result);
      setGeneratedReport('');
      setMessage({ type: 'success', text: '출결 분석이 완료되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.' });
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleGenerateMorningReport(): void {
    if (!summary) {
      setMessage({ type: 'error', text: '먼저 출결 분석을 실행해주세요.' });
      return;
    }

    setGeneratedReport(generateMorningAttendanceReport({ ...summary, cohortName }));
    setMessage({ type: 'info', text: '오전 출결 보고 멘트를 생성했습니다.' });
  }

  function handleGenerateAfternoonReport(): void {
    if (!summary) {
      setMessage({ type: 'error', text: '먼저 출결 분석을 실행해주세요.' });
      return;
    }

    setGeneratedReport(generateAfternoonAttendanceReport({ ...summary, cohortName }));
    setMessage({ type: 'info', text: '오후 출결 보고 멘트를 생성했습니다.' });
  }

  function handleGenerateFinalReport(): void {
    if (!summary) {
      setMessage({ type: 'error', text: '먼저 출결 분석을 실행해주세요.' });
      return;
    }

    setGeneratedReport(generateFinalAttendanceReport({ ...summary, cohortName }));
    setMessage({ type: 'info', text: '최종 확정 출결 보고 멘트를 생성했습니다.' });
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
      <section className="hero-card compact-hero">
        <div>
          <p className="eyebrow">Attendance</p>
          <h1>출결 보고</h1>
          <p className="hero-copy">단위기간 출석부를 분석해 오전, 오후, 최종 Slack 보고 멘트를 생성합니다.</p>
        </div>
        <div className="privacy-badge">개인정보 서버 전송 없음</div>
      </section>

      <section className="panel controls-panel">
        <label className="field-label" htmlFor="cohortName">기수명</label>
        <input id="cohortName" className="text-input" value={cohortName} onChange={(event) => setCohortName(event.target.value)} placeholder="예: PD_8기" />

        <div className="file-row">
          <button type="button" className="primary-button" onClick={handleSelectFile}>엑셀 파일 불러오기</button>
          <div className="file-info">
            <span>선택된 파일</span>
            <strong>{filePath ? getFileName(filePath) : '없음'}</strong>
          </div>
        </div>

        <button type="button" className="accent-button" onClick={handleAnalyze} disabled={isAnalyzing}>{isAnalyzing ? '분석 중...' : '출결 분석하기'}</button>
        {message && <p className={`status-message ${message.type}`}>{message.text}</p>}
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">Summary</p>
            <h2>분석 결과 요약</h2>
          </div>
          {summary ? <SummaryCard summary={summary} /> : <EmptyState text="출석부를 선택한 뒤 분석을 실행해주세요." />}
        </section>

        <section className="panel report-panel">
          <div className="section-heading">
            <p className="eyebrow">Slack Text</p>
            <h2>보고 멘트 생성</h2>
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
      <p className="review-result">출석입력요청: {summary.reviewRequestCount}건 / {summary.reviewResultText}</p>
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
