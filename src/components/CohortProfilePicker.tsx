import { useState } from 'react';
import { COHORT_COURSES, formatCohortProfile } from '../lib/cohortProfiles';
import type { CohortProfileSettings, CreateCohortProfileInput } from '../types/cohortProfile';

interface CohortProfilePickerProps {
  settings: CohortProfileSettings | null;
  error: string;
  isBusy: boolean;
  onCreate: (input: CreateCohortProfileInput) => Promise<boolean>;
  onSelect: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onRetry: () => Promise<void>;
}

export default function CohortProfilePicker({ settings, error, isBusy, onCreate, onSelect, onDelete, onRetry }: CohortProfilePickerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [course, setCourse] = useState('PD');
  const [cohortNumber, setCohortNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!cohortNumber.trim()) {
      return;
    }

    setIsSaving(true);
    const didCreate = await onCreate({ course, cohortNumber });
    setIsSaving(false);
    if (didCreate) {
      setCohortNumber('');
      setIsAdding(false);
    }
  }

  async function handleDelete(id: string, label: string): Promise<void> {
    if (!window.confirm(`${label} 프로필을 삭제할까요?`)) {
      return;
    }
    await onDelete(id);
  }

  return (
    <section className="panel cohort-profile-panel" aria-label="담당 과정 및 기수 선택">
      <div className="cohort-profile-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <strong>담당 과정·기수</strong>
          <span>선택한 과정이 출결과 업무 문구에 함께 적용됩니다.</span>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setIsAdding((value) => !value)}
          aria-expanded={isAdding}
          aria-controls="cohort-profile-form"
          disabled={isBusy || !settings}
        >
          {isAdding ? '닫기' : '+ 과정 추가'}
        </button>
      </div>

      {settings ? (
        <div className="cohort-profile-list">
          {settings.profiles.map((profile) => {
            const isActive = profile.id === settings.activeProfileId;
            return (
              <div className={isActive ? 'cohort-profile-chip active' : 'cohort-profile-chip'} key={profile.id}>
                <button
                  type="button"
                  className="cohort-profile-select"
                  onClick={() => void onSelect(profile.id)}
                  aria-pressed={isActive}
                  disabled={isBusy}
                >
                  {formatCohortProfile(profile)}
                </button>
                {settings.profiles.length > 1 && (
                  <button
                    type="button"
                    className="cohort-profile-delete"
                    onClick={() => void handleDelete(profile.id, formatCohortProfile(profile))}
                    aria-label={`${formatCohortProfile(profile)} 삭제`}
                    disabled={isBusy}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : !error ? (
        <span className="cohort-profile-loading" role="status" aria-live="polite">저장된 과정·기수를 불러오는 중입니다.</span>
      ) : null}

      {isAdding && (
        <form id="cohort-profile-form" className="cohort-profile-form" onSubmit={handleSubmit}>
          <label className="field-stack">
            <span>과정</span>
            <select className="text-input" value={course} onChange={(event) => setCourse(event.target.value)}>
              {COHORT_COURSES.map((option) => <option value={option} key={option}>{option}</option>)}
            </select>
          </label>
          <label className="field-stack">
            <span>기수</span>
            <input
              className="text-input"
              value={cohortNumber}
              onChange={(event) => setCohortNumber(event.target.value.replace(/\D/g, ''))}
              placeholder="예: 8"
              inputMode="numeric"
            />
          </label>
          <button type="submit" className="accent-button" disabled={isSaving || isBusy || !cohortNumber}>
            {isSaving ? '저장 중...' : '추가'}
          </button>
        </form>
      )}

      {error && (
        <div className="cohort-profile-error-row">
          <p className="status-message error cohort-profile-error" role="alert">{error}</p>
          {!settings && (
            <button type="button" className="secondary-button" onClick={() => void onRetry()} disabled={isBusy}>
              다시 시도
            </button>
          )}
        </div>
      )}
    </section>
  );
}
