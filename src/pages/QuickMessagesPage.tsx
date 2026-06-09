import { useEffect, useState } from 'react';
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

const MESSAGE_CATEGORIES = ['불시점검', '강사 공유', '인사'];

export default function QuickMessagesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<QuickMessageTemplate | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [spotCheckDiscordMessage, setSpotCheckDiscordMessage] = useState('');
  const [spotCheckZepMessage, setSpotCheckZepMessage] = useState('');
  const [savedQuickMessages, setSavedQuickMessages] = useState<SavedQuickMessages>({});
  const [copyMessage, setCopyMessage] = useState('');
  const [isSavingGreeting, setIsSavingGreeting] = useState(false);

  useEffect(() => {
    void loadSavedQuickMessages();
  }, []);

  async function loadSavedQuickMessages(): Promise<void> {
    try {
      const messages = await window.cmAssistant.getSavedQuickMessages();
      setSavedQuickMessages(messages);
    } catch (error) {
      setCopyMessage(error instanceof Error ? error.message : '저장된 멘트를 불러오지 못했습니다.');
    }
  }

  function handleSelectTemplate(template: QuickMessageTemplate): void {
    setSelectedTemplate(template);
    if (template.generator === 'spotCheckNotice') {
      const messages = generateSpotCheckNoticeMessages();
      setSpotCheckDiscordMessage(messages.discord);
      setSpotCheckZepMessage(messages.zep);
      setGeneratedMessage('');
    } else if (template.savedKey) {
      setGeneratedMessage(savedQuickMessages[template.savedKey] ?? template.template);
    } else {
      setGeneratedMessage(getTemplateMessage(template));
    }
    setCopyMessage('');
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
    setCopyMessage('현재 시각 기준으로 문구를 갱신했습니다.');
  }

  function handleCopyText(text: string, label: string): void {
    if (!text) {
      setCopyMessage('복사할 멘트를 먼저 선택해주세요.');
      return;
    }

    window.cmAssistant.copyReport(text, convertSlackMarkdownToClipboardHtml(text));
    setCopyMessage(`${label} 복사되었습니다.`);
  }

  function handleCopy(): void {
    if (!generatedMessage) {
      setCopyMessage('복사할 멘트를 먼저 선택해주세요.');
      return;
    }

    if (selectedTemplate?.copyMode === 'plainText') {
      window.cmAssistant.copyText(generatedMessage);
    } else {
      window.cmAssistant.copyReport(generatedMessage, convertSlackMarkdownToClipboardHtml(generatedMessage));
    }
    setCopyMessage('복사되었습니다.');
  }

  async function handleSaveGreeting(): Promise<void> {
    if (!selectedTemplate?.savedKey) {
      return;
    }

    setIsSavingGreeting(true);
    setCopyMessage('');

    try {
      await window.cmAssistant.saveQuickMessage(selectedTemplate.savedKey, generatedMessage);
      const messages = await window.cmAssistant.getSavedQuickMessages();
      setSavedQuickMessages(messages);
      setGeneratedMessage(messages[selectedTemplate.savedKey] ?? generatedMessage);
      setCopyMessage('멘트를 저장했습니다.');
    } catch (error) {
      setCopyMessage(error instanceof Error ? error.message : '인사 멘트 저장에 실패했습니다.');
    } finally {
      setIsSavingGreeting(false);
    }
  }

  return (
    <>
      <section className="hero-card compact-hero simple-hero">
        <div>
          <p className="eyebrow">Work Tools</p>
          <h1>반복 업무를 빠르게 처리해요</h1>
          <p className="hero-copy">불시점검 처럼 매일 반복되는 운영 업무를 바로 처리합니다.</p>
        </div>
      </section>

      <section className="quick-message-layout">
        <div className="panel">
          <div className="section-heading">
            <p className="eyebrow">Step 1</p>
            <h2>업무 선택</h2>
            <p>처리할 운영 업무를 선택하세요.</p>
          </div>
          <div className="quick-message-category-list">
            {MESSAGE_CATEGORIES.map((category) => (
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

        <div className="panel report-panel">
          <div className="section-heading">
            <p className="eyebrow">Step 2</p>
            <h2>{selectedTemplate ? selectedTemplate.title : '확인하고 복사하기'}</h2>
            <p>{selectedTemplate ? '필요하면 내용을 살짝 수정한 뒤 복사하세요.' : '왼쪽에서 먼저 업무를 고르세요.'}</p>
          </div>
          {selectedTemplate?.generator && selectedTemplate.refreshable && (
            <button type="button" className="accent-button quick-message-refresh" onClick={handleRefreshGeneratedMessage}>
              {getRefreshButtonLabel(selectedTemplate.generator)}
            </button>
          )}
          {selectedTemplate?.generator === 'spotCheckNotice' ? (
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
          {copyMessage && <p className="status-message success quick-message-status">{copyMessage}</p>}
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
