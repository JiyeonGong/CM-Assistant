import { useEffect, useState } from 'react';
import type { DailyTimelineRecord } from '../types/timeline';
import { computeDayFlags } from '../lib/timeline';
import { getTodayString } from '../lib/todo';

const PAGE_SIZE = 7;

interface RecordsPageProps {
  onBackToToday: () => void;
  onSelectDate: (date: string) => void;
}

export default function RecordsPage({ onBackToToday, onSelectDate }: RecordsPageProps) {
  const [records, setRecords] = useState<DailyTimelineRecord[]>([]);
  const [managedCourses, setManagedCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [error, setError] = useState('');
  const today = getTodayString();

  useEffect(() => {
    void loadRecords();
  }, []);

  async function loadRecords(): Promise<void> {
    try {
      const [recordList, courses] = await Promise.all([
        window.cmAssistant.listTimelineRecords(),
        window.cmAssistant.listManagedCourses()
      ]);
      setRecords(recordList);
      setManagedCourses(courses);
      setSelectedCourse((current) => current || courses[0] || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '기록을 불러오지 못했습니다.');
    }
  }

  const visibleRecords = records.slice(0, visibleCount);

  return (
    <>
      <section className="hero-card compact-hero simple-hero">
        <div>
          <button type="button" className="back-link" onClick={onBackToToday}>← 오늘로 돌아가기</button>
          <h1>데일리 업무 기록</h1>
          <p className="hero-copy">날짜별로 로그불일치·불시점검 적발 여부를 한눈에 확인하고, 행을 클릭해 해당 날짜로 이동하세요.</p>
        </div>
      </section>

      {error && <p className="status-message error app-level-message">{error}</p>}

      {managedCourses.length > 0 && (
        <div className="course-chip-list records-course-filter">
          {managedCourses.map((course) => (
            <button
              type="button"
              className={course === selectedCourse ? 'course-filter-chip active' : 'course-filter-chip'}
              onClick={() => setSelectedCourse(course)}
              key={course}
            >
              {course}
            </button>
          ))}
        </div>
      )}

      <section className="panel records-panel">
        <table className="records-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>이름</th>
              <th>로그불일치</th>
              <th>불시점검 적발</th>
            </tr>
          </thead>
          <tbody>
            {visibleRecords.map((record) => {
              const flags = computeDayFlags(record, selectedCourse || undefined);
              const isToday = record.date === today;
              return (
                <tr className={isToday ? 'records-row today' : 'records-row'} onClick={() => onSelectDate(record.date)} key={record.date}>
                  <td>
                    <strong>{formatRecordDate(record.date)}</strong>
                    {isToday && <span className="today-label"> · 오늘</span>}
                  </td>
                  <td>
                    <span className="record-name-icon" aria-hidden="true">▤</span>
                    데일리 업무 체크
                  </td>
                  <td><RecordFlag active={flags.hasLogMismatch} /></td>
                  <td><RecordFlag active={flags.hasSpotCheckFinding} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleRecords.length === 0 && <div className="empty-state small">아직 기록이 없습니다.</div>}
        {visibleCount < records.length && (
          <button type="button" className="secondary-button records-load-more" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            ▾ 이전 날짜 더 불러오기
          </button>
        )}
      </section>
    </>
  );
}

function RecordFlag({ active }: { active: boolean }) {
  return <span className={active ? 'record-flag active' : 'record-flag'}>{active ? '✓' : ''}</span>;
}

function formatRecordDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}
