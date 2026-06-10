import { useEffect, useRef, useState } from 'react';
import {
  generateSpotCheckFollowUpMessage,
  generateSpotCheckNoticeMessage,
  generateSpotCheckNoticeMessages,
  generateSpotCheckResultMessage,
  QUICK_MESSAGE_TEMPLATES
} from '../lib/quickMessages';
import { convertSlackMarkdownToClipboardHtml } from '../lib/slackClipboard';
import type { SavedQuickMessages } from '../types/appData';
import type { QuickMessageTemplate } from '../types/quickMessage';

const MESSAGE_CATEGORIES = ['불시점검', '로그 대조 결과 안내', '강사 공유', '인사', '단위기간 종료'];
const LOG_ATTENDANCE_TYPES = ['출석', '지각', '외출', '조퇴', '100분의50미만', '지각&외출', '외출&조퇴', '지각&조퇴', '외출&지각&조퇴'];

type ToastType = 'success' | 'error' | 'warning';

type ToastMessage = {
  text: string;
  type: ToastType;
};

export default function QuickMessagesPage() {
  const reportPanelRef = useRef<HTMLDivElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedTemplate, setSelectedTemplate] = useState<QuickMessageTemplate | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [spotCheckDiscordMessage, setSpotCheckDiscordMessage] = useState('');
  const [spotCheckZepMessage, setSpotCheckZepMessage] = useState('');
  const [savedQuickMessages, setSavedQuickMessages] = useState<SavedQuickMessages>({});
  const [isSavingGreeting, setIsSavingGreeting] = useState(false);
  const [spotCheckTimerMinutes, setSpotCheckTimerMinutes] = useState('15');
  const [spotCheckTimerSeconds, setSpotCheckTimerSeconds] = useState('0');
  const [spotCheckTimerEndAt, setSpotCheckTimerEndAt] = useState<number | null>(null);
  const [activeSpotCheckTimerSeconds, setActiveSpotCheckTimerSeconds] = useState(15 * 60);
  const [spotCheckTimerStartedAt, setSpotCheckTimerStartedAt] = useState<number | null>(null);
  const [spotCheckTimerNow, setSpotCheckTimerNow] = useState(Date.now());
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
  const [logBeforeAttendanceType, setLogBeforeAttendanceType] = useState(LOG_ATTENDANCE_TYPES[0]);
  const [logAfterAttendanceType, setLogAfterAttendanceType] = useState('외출');
  const [logStudentName, setLogStudentName] = useState('');
  const [logDate, setLogDate] = useState(getDateInputValue());
  const [logHrdTime, setLogHrdTime] = useState('');
  const [logZepTime, setLogZepTime] = useState('');

  useEffect(() => {
    void loadSavedQuickMessages();
  }, []);

  useEffect(() => {
    if (!spotCheckTimerEndAt) {
      return undefined;
    }

    const intervalId = window.setInterval(() => setSpotCheckTimerNow(Date.now()), 1_000);
    return () => window.clearInterval(intervalId);
  }, [spotCheckTimerEndAt]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setToastMessage(null), toastMessage.type === 'warning' ? 5_000 : 2_400);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    if (!spotCheckTimerEndAt || spotCheckTimerNow < spotCheckTimerEndAt) {
      return;
    }

    setSpotCheckTimerEndAt(null);
    const startedTime = spotCheckTimerStartedAt ? formatClockTime(spotCheckTimerStartedAt) : '설정 시각';
    const endedTime = formatClockTime(spotCheckTimerEndAt);
    const durationLabel = formatDurationLabel(activeSpotCheckTimerSeconds);
    showToast(`복귀 확인 시간입니다. Zep/Discord 확인 후 미복귀자는 후속 조치을 진행하세요.`, 'warning');
    void window.cmAssistant.showNotification(
      '불시점검 복귀 확인',
      `${startedTime} 안내 후 ${durationLabel} 경과 (${endedTime})\nZep/Discord 복귀 여부 확인 후 미복귀자는 후속 조치를 진행해주세요.`
    );
  }, [activeSpotCheckTimerSeconds, spotCheckTimerEndAt, spotCheckTimerNow, spotCheckTimerStartedAt]);

  async function loadSavedQuickMessages(): Promise<void> {
    try {
      const messages = await window.cmAssistant.getSavedQuickMessages();
      setSavedQuickMessages(messages);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '저장된 멘트를 불러오지 못했습니다.', 'error');
    }
  }

  function handleSelectTemplate(template: QuickMessageTemplate): void {
    setSelectedTemplate(template);
    if (template.generator === 'spotCheckNotice') {
      const messages = generateSpotCheckNoticeMessages();
      setSpotCheckDiscordMessage(messages.discord);
      setSpotCheckZepMessage(messages.zep);
      setGeneratedMessage('');
    } else if (template.generator === 'logComparison') {
      setGeneratedMessage('');
    } else if (template.savedKey) {
      setGeneratedMessage(savedQuickMessages[template.savedKey] ?? template.template);
    } else {
      setGeneratedMessage(getTemplateMessage(template));
    }
    setToastMessage(null);
    window.requestAnimationFrame(() => {
      reportPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function handleRefreshGeneratedMessage(): void {
    if (!selectedTemplate?.generator) {
      return;
    }

    if (selectedTemplate.generator === 'spotCheckNotice') {
      const messages = generateSpotCheckNoticeMessages();
      setSpotCheckDiscordMessage(messages.discord);
      setSpotCheckZepMessage(messages.zep);
    } else {
      setGeneratedMessage(getGeneratedMessage(selectedTemplate.generator));
    }
    showToast('현재 시각 기준으로 문구를 갱신했습니다.', 'success');
  }

  function handleCopyText(text: string, label: string): void {
    if (!text) {
      showToast('복사할 멘트를 먼저 선택해주세요.', 'error');
      return;
    }

    window.cmAssistant.copyReport(text, convertSlackMarkdownToClipboardHtml(text));
    showToast(`${label} 복사되었습니다.`, 'success');
  }

  function handleCopy(): void {
    if (!generatedMessage) {
      showToast('복사할 멘트를 먼저 선택해주세요.', 'error');
      return;
    }

    if (selectedTemplate?.copyMode === 'plainText') {
      window.cmAssistant.copyText(generatedMessage);
    } else {
      window.cmAssistant.copyReport(generatedMessage, convertSlackMarkdownToClipboardHtml(generatedMessage));
    }
    showToast('복사되었습니다.', 'success');
  }

  async function handleSaveGreeting(): Promise<void> {
    if (!selectedTemplate?.savedKey) {
      return;
    }

    setIsSavingGreeting(true);
    setToastMessage(null);

    try {
      await window.cmAssistant.saveQuickMessage(selectedTemplate.savedKey, generatedMessage);
      const messages = await window.cmAssistant.getSavedQuickMessages();
      setSavedQuickMessages(messages);
      setGeneratedMessage(messages[selectedTemplate.savedKey] ?? generatedMessage);
      showToast('멘트를 저장했습니다.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '인사 멘트 저장에 실패했습니다.', 'error');
    } finally {
      setIsSavingGreeting(false);
    }
  }

  function showToast(text: string, type: ToastType): void {
    setToastMessage({ text, type });
  }

  function handleStartSpotCheckTimer(): void {
    const parsedMinutes = Number(spotCheckTimerMinutes);
    const parsedSeconds = Number(spotCheckTimerSeconds);
    if (!Number.isFinite(parsedMinutes) || !Number.isFinite(parsedSeconds) || parsedMinutes < 0 || parsedSeconds < 0) {
      showToast('타이머는 0 이상의 분/초로 입력해주세요.', 'error');
      return;
    }

    if (parsedSeconds >= 60) {
      showToast('초는 0~59 사이로 입력해주세요.', 'error');
      return;
    }

    const totalSeconds = Math.floor(parsedMinutes) * 60 + Math.floor(parsedSeconds);
    if (totalSeconds < 1) {
      showToast('타이머는 최소 1초 이상으로 입력해주세요.', 'error');
      return;
    }

    const now = Date.now();
    setActiveSpotCheckTimerSeconds(totalSeconds);
    setSpotCheckTimerStartedAt(now);
    setSpotCheckTimerEndAt(now + totalSeconds * 1000);
    setSpotCheckTimerNow(now);
    showToast(`${formatDurationLabel(totalSeconds)} 뒤 복귀 확인 알림을 설정했습니다.`, 'success');
  }

  function handleCancelSpotCheckTimer(): void {
    setSpotCheckTimerEndAt(null);
    setSpotCheckTimerStartedAt(null);
    showToast('불시점검 복귀 확인 타이머를 종료했습니다.', 'success');
  }

  function handleCopyLogComparisonMessage(): void {
    if (!logStudentName.trim()) {
      showToast('수강생 이름을 입력해주세요.', 'error');
      return;
    }

    if (logAfterAttendanceType !== '출석' && (!isCompleteTime(logHrdTime) || !isCompleteTime(logZepTime))) {
      showToast('HRD/Zep 시간을 nn:nn 형태로 입력해주세요.', 'error');
      return;
    }

    window.cmAssistant.copyText(logComparisonMessage);
    showToast('로그 대조 안내 문구가 복사되었습니다.', 'success');
  }

  const isSpotCheckNoticeTemplate = selectedTemplate?.generator === 'spotCheckNotice';
  const isLogComparisonTemplate = selectedTemplate?.generator === 'logComparison';
  const remainingSpotCheckSeconds = spotCheckTimerEndAt ? Math.max(0, Math.ceil((spotCheckTimerEndAt - spotCheckTimerNow) / 1000)) : 0;
  const shouldShowLogTimeInputs = logAfterAttendanceType !== '출석';
  const logComparisonMessage = generateLogComparisonMessage({
    studentName: logStudentName,
    date: logDate,
    beforeAttendanceType: logBeforeAttendanceType,
    afterAttendanceType: logAfterAttendanceType,
    hrdTime: logHrdTime,
    zepTime: logZepTime
  });
  const logTimeFieldLabels = getLogTimeFieldLabels(logAfterAttendanceType);

  return (
    <>
      {toastMessage && (
        <div className={`quick-message-toast ${toastMessage.type}`} role="status" aria-live="polite">
          {toastMessage.text}
        </div>
      )}
      <section className="hero-card compact-hero simple-hero">
        <div>
          <p className="eyebrow">Work Tools</p>
          <h1>오늘 업무를 빠르게 처리해요</h1>
          <p className="hero-copy">불시점검 처럼 매일 반복되는 행정 업무의 빠른 처리를 도와드립니다.</p>
        </div>
      </section>

      <section className="quick-message-layout">
        <div className="panel">
          <div className="section-heading">
            <p className="eyebrow">Step 1</p>
            <h2>업무 선택</h2>
            <p>처리할 운영 업무를 선택하세요.</p>
          </div>
          <nav className="work-category-rail" aria-label="업무 카테고리 바로가기">
            {['전체', ...MESSAGE_CATEGORIES].map((category) => (
              <button
                type="button"
                className={selectedCategory === category ? 'active' : ''}
                onClick={() => setSelectedCategory(category)}
                key={category}
              >
                <span aria-hidden="true" />
                <strong>{getCategoryRailLabel(category)}</strong>
              </button>
            ))}
          </nav>
          <div className="quick-message-category-list scrollable-work-categories">
            {getVisibleMessageCategories(selectedCategory).map((category) => (
              <section className="quick-message-category" key={category}>
                <h3>{category}</h3>
                <div className="quick-message-grid">
                  {QUICK_MESSAGE_TEMPLATES.filter((template) => template.category === category).map((template) => (
                    <button
                      type="button"
                      className={selectedTemplate?.id === template.id ? 'quick-message-card active' : 'quick-message-card'}
                      onClick={() => handleSelectTemplate(template)}
                      key={template.id}
                    >
                      <span>{template.category}</span>
                      <strong>{template.title}</strong>
                      <small>{template.description}</small>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="panel report-panel" ref={reportPanelRef}>
          <div className="section-heading">
            <p className="eyebrow">Step 2</p>
            <h2>{selectedTemplate ? selectedTemplate.title : '확인하고 복사하기'}</h2>
            <p>{selectedTemplate ? '필요하면 내용을 살짝 수정한 뒤 복사하세요.' : '왼쪽에서 먼저 업무를 골라주세요.'}</p>
          </div>
          {selectedTemplate?.generator && selectedTemplate.refreshable && (
            <button type="button" className="accent-button quick-message-refresh" onClick={handleRefreshGeneratedMessage}>
              {getRefreshButtonLabel(selectedTemplate.generator)}
            </button>
          )}
          {isSpotCheckNoticeTemplate && (
            <section className="spot-check-timer-panel">
              <div>
                <strong>복귀 확인 타이머</strong>
                <span>
                  {spotCheckTimerEndAt
                    ? `${formatRemainingTime(remainingSpotCheckSeconds)} 남음 · ${formatClockTime(spotCheckTimerEndAt)} 확인`
                    : '기본 15분 0초 뒤 복귀 확인 알림'}
                </span>
              </div>
              <div className="spot-check-timer-actions">
                <label className="timer-input-field">
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    value={spotCheckTimerMinutes}
                    onChange={(event) => setSpotCheckTimerMinutes(event.target.value)}
                    aria-label="불시점검 타이머 분"
                  />
                  <span>분</span>
                </label>
                <label className="timer-input-field">
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    max="59"
                    value={spotCheckTimerSeconds}
                    onChange={(event) => setSpotCheckTimerSeconds(event.target.value)}
                    aria-label="불시점검 타이머 초"
                  />
                  <span>초</span>
                </label>
                {spotCheckTimerEndAt ? (
                  <button type="button" className="timer-stop-button" onClick={handleCancelSpotCheckTimer}>타이머 종료</button>
                ) : (
                  <button type="button" className="primary-button" onClick={handleStartSpotCheckTimer}>타이머 시작</button>
                )}
              </div>
            </section>
          )}
          {isLogComparisonTemplate ? (
            <section className="log-comparison-panel">
              <div className="log-time-grid">
                <label className="field-stack">
                  <span>수강생 이름</span>
                  <input className="text-input" value={logStudentName} onChange={(event) => setLogStudentName(event.target.value)} placeholder="이름" />
                </label>
                <label className="field-stack">
                  <span>기준 날짜</span>
                  <input className="text-input" type="date" value={logDate} onChange={(event) => setLogDate(event.target.value)} />
                </label>
              </div>
              <div className="log-time-grid">
                <label className="field-stack">
                  <span>변경 전 출석</span>
                  <select className="text-input" value={logBeforeAttendanceType} onChange={(event) => setLogBeforeAttendanceType(event.target.value)}>
                    {LOG_ATTENDANCE_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}
                  </select>
                </label>
                <label className="field-stack">
                  <span>변경 후 출석</span>
                  <select className="text-input" value={logAfterAttendanceType} onChange={(event) => setLogAfterAttendanceType(event.target.value)}>
                    {LOG_ATTENDANCE_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}
                  </select>
                </label>
              </div>
              {shouldShowLogTimeInputs && (
                <>
                  <div className="log-time-grid">
                    <label className="field-stack">
                      <span>{logTimeFieldLabels.first}</span>
                      <input
                        className="text-input"
                        value={logHrdTime}
                        onChange={(event) => setLogHrdTime(event.target.value)}
                        onBlur={(event) => setLogHrdTime(normalizeTimeInput(event.target.value))}
                        placeholder="nn:nn"
                        inputMode="numeric"
                        maxLength={5}
                        aria-label={logTimeFieldLabels.first}
                      />
                    </label>
                    <label className="field-stack">
                      <span>{logTimeFieldLabels.second}</span>
                      <input
                        className="text-input"
                        value={logZepTime}
                        onChange={(event) => setLogZepTime(event.target.value)}
                        onBlur={(event) => setLogZepTime(normalizeTimeInput(event.target.value))}
                        placeholder="nn:nn"
                        inputMode="numeric"
                        maxLength={5}
                        aria-label={logTimeFieldLabels.second}
                      />
                    </label>
                  </div>
                  <p className="form-hint">시간은 09:05 또는 905처럼 입력해주세요. 입력값은 안내 문구에 자동 반영됩니다.</p>
                </>
              )}
              <textarea className="report-output compact-output" value={logComparisonMessage} readOnly />
              <button type="button" className="copy-button" onClick={handleCopyLogComparisonMessage}>안내 문구 복사</button>
            </section>
          ) : selectedTemplate?.generator === 'spotCheckNotice' ? (
            <div className="spot-check-notice-sections">
              <div className="message-section">
                <h3>디스코드 DM</h3>
                <textarea
                  className="report-output compact-output"
                  value={spotCheckDiscordMessage}
                  onChange={(event) => setSpotCheckDiscordMessage(event.target.value)}
                />
                <div className="message-action-row">
                  <button type="button" className="copy-button" onClick={() => handleCopyText(spotCheckDiscordMessage, '디스코드 DM')}>디스코드 DM 복사</button>
                </div>
              </div>
              <div className="message-section">
                <h3>Zep 채팅</h3>
                <textarea
                  className="report-output compact-output"
                  value={spotCheckZepMessage}
                  onChange={(event) => setSpotCheckZepMessage(event.target.value)}
                />
                <div className="message-action-row">
                  <button type="button" className="copy-button" onClick={() => handleCopyText(spotCheckZepMessage, 'Zep 채팅')}>Zep 채팅 복사</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <textarea
                className="report-output"
                value={generatedMessage}
                onChange={(event) => setGeneratedMessage(event.target.value)}
                placeholder="왼쪽에서 업무를 선택하면 필요한 문구가 여기에 표시됩니다."
              />
              <div className="message-action-row">
                <button type="button" className="copy-button" onClick={handleCopy}>복사하기</button>
                {selectedTemplate?.savedKey && (
                  <button type="button" className="secondary-button" onClick={handleSaveGreeting} disabled={isSavingGreeting}>
                    {isSavingGreeting ? '저장 중...' : '내 멘트 저장'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function getTemplateMessage(template: QuickMessageTemplate): string {
  if (template.generator) {
    return getGeneratedMessage(template.generator);
  }

  return template.template;
}

function getGeneratedMessage(generator: NonNullable<QuickMessageTemplate['generator']>): string {
  if (generator === 'spotCheckNotice') {
    return generateSpotCheckNoticeMessage();
  }

  if (generator === 'spotCheckFollowUp') {
    return generateSpotCheckFollowUpMessage();
  }

  if (generator === 'logComparison') {
    return '';
  }

  return generateSpotCheckResultMessage();
}

function getRefreshButtonLabel(generator: NonNullable<QuickMessageTemplate['generator']>): string {
  if (generator === 'spotCheckNotice') {
    return '불시점검 안내 문구 갱신';
  }

  if (generator === 'spotCheckFollowUp') {
    return '후속 DM 문구 갱신';
  }

  return '결과 보고 문구 갱신';
}

function normalizeTimeInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (!digits) {
    return '';
  }

  if (digits.length <= 2) {
    return digits.padStart(2, '0');
  }

  if (digits.length === 3) {
    return `0${digits.slice(0, 1)}:${digits.slice(1)}`;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function getCategoryRailLabel(category: string): string {
  switch (category) {
    case '전체':
      return '전체';
    case '불시점검':
      return '불시점검';
    case '로그 대조 결과 안내':
      return '로그';
    case '강사 공유':
      return '강사';
    case '인사':
      return '인사';
    case '단위기간 종료':
      return '단위종료';
    default:
      return category;
  }
}

function getVisibleMessageCategories(selectedCategory: string): string[] {
  return selectedCategory === '전체' ? MESSAGE_CATEGORIES : [selectedCategory];
}

function isCompleteTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

function getDateInputValue(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatLogDate(dateValue: string): string {
  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${month}/${day}(${weekdays[date.getDay()]})`;
}

function generateLogComparisonMessage({
  studentName,
  date,
  beforeAttendanceType,
  afterAttendanceType,
  hrdTime,
  zepTime
}: {
  studentName: string;
  date: string;
  beforeAttendanceType: string;
  afterAttendanceType: string;
  hrdTime: string;
  zepTime: string;
}): string {
  const displayName = studentName.trim() || '(이름)';
  const displayDate = date ? formatLogDate(date) : 'n/n(요일)';

  if (afterAttendanceType === '출석') {
    return `${displayName}님! ${displayDate} 출결은 Zep 로그를 통해 정상 출석으로 변경될 예정이오니 참고 부탁드립니다!`;
  }

  const hrdDisplayTime = hrdTime || 'nn:nn';
  const zepDisplayTime = zepTime || 'nn:nn';
  const changeReason = getLogComparisonChangeReason(afterAttendanceType, hrdDisplayTime, zepDisplayTime);

  return `${displayName}님! ${displayDate} ZEP 로그 기록 확인 후 연락드렸습니다.
ZEP 로그 기록과 HRD 출석부 대조 결과, 15분 이상 초과 차이가 있습니다. 따라서, ${displayDate} 확정 출결이 아래와 같이 변경될 예정입니다.

<변경 내용>
변경 전 : ${beforeAttendanceType}
변경 후 : ${afterAttendanceType}
변경사유: ${changeReason}

ZEP 로그 기록과 HRD 입퇴실 기록은 항상 일치해야 하오니, 다음부터는 꼭 시간 차 없이 동시진행 부탁드립니다!`;
}

function getLogTimeFieldLabels(attendanceType: string): { first: string; second: string } {
  if (attendanceType === '외출') {
    return { first: 'Zep 외출 시각', second: 'Zep 복귀 시각' };
  }

  if (attendanceType === '지각') {
    return { first: 'HRD 입실 QR 스캔 시각', second: 'Zep 접속시각' };
  }

  return { first: 'HRD 퇴실 QR 스캔 시각', second: 'Zep 접속시각' };
}

function getLogComparisonChangeReason(attendanceType: string, firstTime: string, secondTime: string): string {
  if (attendanceType === '외출') {
    return `Zep 외출 시각 ${firstTime} / Zep 복귀 시각 ${secondTime}`;
  }

  const firstLabel = attendanceType === '지각' ? 'HRD 입실 QR 스캔 시각' : 'HRD 퇴실 QR 스캔 시각';
  return `${firstLabel} ${firstTime} / ZEP 접속시각 ${secondTime}`;
}

function formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatDurationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}초`;
  }

  if (remainingSeconds === 0) {
    return `${minutes}분`;
  }

  return `${minutes}분 ${remainingSeconds}초`;
}

function formatClockTime(timestamp: number): string {
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(timestamp));
}
