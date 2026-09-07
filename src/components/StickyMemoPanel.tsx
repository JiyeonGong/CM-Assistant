import { useEffect, useRef, useState } from 'react';
import type { MemoTemplate } from '../types/appData';
import { BUILTIN_MEMO_TEMPLATES } from '../lib/memoTemplates';

const AUTOSAVE_DELAY_MS = 800;

export default function StickyMemoPanel() {
  const [memo, setMemo] = useState('');
  const [customTemplates, setCustomTemplates] = useState<MemoTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [error, setError] = useState('');
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    void loadMemoData();

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!saveStatus) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setSaveStatus(''), 2_000);
    return () => window.clearTimeout(timeoutId);
  }, [saveStatus]);

  async function loadMemoData(): Promise<void> {
    try {
      const [savedMemo, templates] = await Promise.all([
        window.cmAssistant.getPersonalMemo(),
        window.cmAssistant.listMemoTemplates()
      ]);
      setMemo(savedMemo);
      setCustomTemplates(templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : '메모를 불러오지 못했습니다.');
    }
  }

  function handleMemoChange(value: string): void {
    setMemo(value);
    scheduleSave(value);
  }

  function scheduleSave(value: string): void {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      void persistMemo(value);
    }, AUTOSAVE_DELAY_MS);
  }

  async function persistMemo(value: string): Promise<void> {
    try {
      await window.cmAssistant.savePersonalMemo(value);
      setSaveStatus('저장됨');
    } catch (err) {
      setError(err instanceof Error ? err.message : '메모 저장에 실패했습니다.');
    }
  }

  function handleInsertTemplate(template: MemoTemplate): void {
    const nextValue = memo.trim() ? `${memo}\n\n${template.content}` : template.content;
    setMemo(nextValue);
    scheduleSave(nextValue);
    setShowTemplates(false);
  }

  async function handleCreateTemplate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!newTitle.trim()) {
      return;
    }

    try {
      await window.cmAssistant.createMemoTemplate({ title: newTitle, content: newContent });
      setNewTitle('');
      setNewContent('');
      const templates = await window.cmAssistant.listMemoTemplates();
      setCustomTemplates(templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : '양식을 추가하지 못했습니다.');
    }
  }

  async function handleDeleteTemplate(id: string): Promise<void> {
    try {
      await window.cmAssistant.deleteMemoTemplate(id);
      const templates = await window.cmAssistant.listMemoTemplates();
      setCustomTemplates(templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : '양식을 삭제하지 못했습니다.');
    }
  }

  return (
    <aside className="sticky-memo-panel">
      <div className="panel memo-panel">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Memo</p>
            <h2>메모</h2>
          </div>
          {saveStatus && <span className="memo-save-status">{saveStatus}</span>}
        </div>
        <textarea
          className="report-output memo-textarea"
          value={memo}
          onChange={(event) => handleMemoChange(event.target.value)}
          placeholder="자유롭게 메모하세요. 자동으로 저장됩니다."
        />
        {error && <p className="status-message error">{error}</p>}
        <button type="button" className="secondary-button memo-template-button" onClick={() => setShowTemplates(true)}>
          양식 모음
        </button>
      </div>

      {showTemplates && (
        <div className="modal-overlay" onClick={() => setShowTemplates(false)}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>양식 모음</h3>
              <button type="button" className="icon-button" aria-label="닫기" onClick={() => setShowTemplates(false)}>×</button>
            </div>

            <section className="memo-template-section">
              <h4>기본 제공</h4>
              <div className="memo-template-list">
                {BUILTIN_MEMO_TEMPLATES.map((template) => (
                  <button type="button" className="memo-template-item" onClick={() => handleInsertTemplate(template)} key={template.id}>
                    <strong>{template.title}</strong>
                    <span>{template.content}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="memo-template-section">
              <h4>내 양식</h4>
              <div className="memo-template-list">
                {customTemplates.map((template) => (
                  <div className="memo-template-item custom" key={template.id}>
                    <button type="button" onClick={() => handleInsertTemplate(template)}>
                      <strong>{template.title}</strong>
                      <span>{template.content}</span>
                    </button>
                    <button type="button" className="icon-button" aria-label={`${template.title} 삭제`} onClick={() => handleDeleteTemplate(template.id)}>×</button>
                  </div>
                ))}
                {customTemplates.length === 0 && <div className="empty-state small">아직 추가한 양식이 없습니다.</div>}
              </div>
            </section>

            <form className="memo-template-form" onSubmit={handleCreateTemplate}>
              <h4>+ 나만의 양식 추가</h4>
              <input className="text-input" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="양식 제목" />
              <textarea
                className="text-input memo-template-content-input"
                value={newContent}
                onChange={(event) => setNewContent(event.target.value)}
                placeholder="양식 내용"
              />
              <button type="submit" className="accent-button">추가</button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
