# CM Assistant 2단계 기능 정의서: Calendar + To-do + Timer

## 0. 문서 목적

이 문서는 CM Assistant 1차 MVP 이후 추가할 **캘린더 / To-do / 타이머 / 업무 로그 기능**의 개발 방향을 정리한 문서다.

기존 1차 MVP는 다음 기능을 중심으로 한다.

- 출결 엑셀 분석
- 출석률 계산
- 출결현황보고 멘트 자동 출력
- 불시점검 멘트 자동 출력
- Slack 복사용 문구 생성

2단계에서는 단순 캘린더 앱이 아니라, 행정팀이 매일 바뀌는 업무를 관리할 수 있는 **업무 운영 도구**를 목표로 한다.

---

# 1. 핵심 방향

## 1.1 캘린더 중심이 아니라 To-do 중심

처음에는 Apple Calendar 같은 캘린더 화면을 생각했지만, 실제 행정 업무는 고정 일정보다 매일 바뀌는 할 일이 많다.

따라서 핵심 구조는 다음과 같다.

```text
오늘 해야 할 일
↓
업무 상태 관리
↓
타이머로 작업 시간 측정
↓
업무 로그 자동 저장
↓
필요하면 캘린더에서 날짜별로 확인
```

캘린더는 메인 기능이 아니라, 날짜별 업무를 확인하는 보조 기능이다.

---

# 2. 전체 탭 구조 제안

프로그램 전체 탭은 다음 구조를 권장한다.

```text
1. Dashboard
2. Attendance
3. Report Generator
4. Todo
5. Calendar
6. Timer / Work Log
7. Settings
```

단, 2단계에서 실제 구현 우선순위는 아래와 같다.

```text
1순위: Todo
2순위: Timer
3순위: Work Log
4순위: Calendar
```

---

# 3. Dashboard 화면

## 3.1 목적

프로그램을 켰을 때 오늘 해야 할 업무를 바로 확인하는 첫 화면이다.

## 3.2 표시 요소

```text
오늘 날짜
오늘 해야 할 일 목록
진행 중인 업무
완료한 업무
현재 실행 중인 타이머
오늘 총 작업 시간
```

## 3.3 예시 UI

```text
2026년 6월 8일 월요일

오늘 해야 할 일
--------------------------------
□ PD8기 출결 확인
□ HRD 입력
□ 휴공가 신청 검토
□ 학생 문의 답변

진행 중
--------------------------------
▶ PD8기 출결 확인   00:17:23

오늘 완료
--------------------------------
✓ 불시점검 멘트 공유
✓ 출결현황보고 멘트 공유

오늘 총 작업 시간: 1시간 12분
```

---

# 4. Todo 기능

## 4.1 목적

사용자가 매일 바뀌는 업무를 직접 입력하고 관리할 수 있게 한다.

## 4.2 기본 기능

- 새 할 일 추가
- 할 일 수정
- 할 일 삭제
- 상태 변경
- 마감 날짜 지정
- 우선순위 지정
- 업무 카테고리 지정
- 메모 입력

## 4.3 Todo 데이터 항목

```ts
interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'hold';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  dueDate?: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

## 4.4 상태값

```text
todo        = 진행 전
in_progress = 진행 중
done        = 완료
hold        = 보류
```

## 4.5 우선순위

```text
high   = 높음
medium = 보통
low    = 낮음
```

## 4.6 업무 카테고리 예시

```text
출결관리
HRD
휴공가
학생문의
보고
문서작업
기타
```

## 4.7 Todo 화면 예시

```text
[+ 새 할 일]

진행 전
--------------------------------
[높음] PD8기 출결 확인      오늘
[보통] HRD 입력             오늘
[낮음] 학생 문의 답변       오늘

진행 중
--------------------------------
[높음] 휴공가 신청 검토     00:12:41

완료
--------------------------------
✓ 불시점검 멘트 공유
✓ 출결현황보고 멘트 공유

보류
--------------------------------
- 수료생 설문 정리
```

---

# 5. Timer 기능

## 5.1 목적

각 업무에 걸린 시간을 측정하고, 나중에 업무 통계와 로그로 활용한다.

## 5.2 기본 기능

- Todo별 타이머 시작
- 타이머 일시정지
- 타이머 재개
- 타이머 종료
- 작업 시간 자동 저장
- 현재 진행 중인 타이머 표시

## 5.3 사용 흐름

```text
Todo 선택
↓
[시작] 버튼 클릭
↓
타이머 실행
↓
[완료] 또는 [정지] 클릭
↓
업무 로그 자동 저장
```

## 5.4 Timer 데이터 항목

```ts
interface TimerSession {
  id: string;
  todoId?: string;
  title: string;
  category?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  status: 'running' | 'paused' | 'finished';
  memo?: string;
}
```

## 5.5 타이머 UI 예시

```text
현재 작업 중
--------------------------------
PD8기 출결 확인

00:17:23

[일시정지] [완료]
```

---

# 6. Work Log 기능

## 6.1 목적

하루 동안 어떤 일을 얼마나 했는지 자동 기록한다.

## 6.2 자동 기록 기준

타이머가 종료되면 Work Log가 자동 생성된다.

## 6.3 Work Log 데이터 항목

```ts
interface WorkLog {
  id: string;
  todoId?: string;
  title: string;
  category?: string;
  date: string; // YYYY-MM-DD
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  memo?: string;
}
```

## 6.4 Work Log 화면 예시

```text
2026년 6월 8일 업무 로그

09:02 ~ 09:21
PD8기 출결 확인
소요 시간: 19분

10:15 ~ 10:37
휴공가 신청 검토
소요 시간: 22분

14:01 ~ 15:03
주간 보고 작성
소요 시간: 1시간 2분

오늘 총 작업 시간: 1시간 43분
```

---

# 7. Calendar 기능

## 7.1 역할

캘린더는 To-do와 Work Log를 날짜별로 보여주는 보조 기능이다.

즉, 사용자가 직접 일정을 많이 등록하는 방식보다는 다음 데이터를 날짜에 표시한다.

```text
해당 날짜의 Todo
해당 날짜의 완료 업무
해당 날짜의 업무 로그
마감일이 있는 업무
```

## 7.2 캘린더 기본 보기

- 월간 보기
- 주간 보기
- 일간 보기는 후순위

## 7.3 캘린더 월간 보기 예시

```text
2026년 6월

6/8 월
- PD8기 출결 확인
- HRD 입력
- 휴공가 검토

6/9 화
- 주간 보고 작성
- 학생 문의 정리

6/10 수
- 수료생 설문 확인
```

## 7.4 날짜 클릭 시 상세 패널

```text
2026년 6월 8일 월요일

해야 할 일
--------------------------------
□ PD8기 출결 확인
□ HRD 입력

완료한 일
--------------------------------
✓ 불시점검 멘트 공유
✓ 출결현황보고 멘트 공유

업무 로그
--------------------------------
09:02 ~ 09:21 PD8기 출결 확인
10:15 ~ 10:37 휴공가 신청 검토
```

---

# 8. 반복 업무 기능

## 8.1 목적

매일 또는 매주 반복되는 행정 업무를 자동으로 Todo에 생성한다.

## 8.2 반복 업무 예시

```text
매일 출결 확인
매일 출결현황보고 멘트 공유
매일 불시점검 멘트 공유
매주 주간 보고
매월 출석률 확인
```

## 8.3 반복 규칙 데이터 항목

```ts
interface RecurringTaskRule {
  id: string;
  title: string;
  category?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0 Sunday ~ 6 Saturday
  dayOfMonth?: number;
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  createdAt: string;
}
```

## 8.4 반복 업무 생성 방식

프로그램 시작 시 오늘 날짜 기준으로 반복 업무를 확인하고, 오늘 생성되어야 할 Todo가 없으면 자동 생성한다.

```text
앱 실행
↓
오늘 날짜 확인
↓
반복 업무 규칙 조회
↓
오늘 생성 대상 확인
↓
Todo 자동 생성
```

---

# 9. SQLite 테이블 설계 초안

## 9.1 todos

```sql
CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT,
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
```

## 9.2 timer_sessions

```sql
CREATE TABLE timer_sessions (
  id TEXT PRIMARY KEY,
  todo_id TEXT,
  title TEXT NOT NULL,
  category TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER,
  status TEXT NOT NULL,
  memo TEXT,
  FOREIGN KEY (todo_id) REFERENCES todos(id)
);
```

## 9.3 work_logs

```sql
CREATE TABLE work_logs (
  id TEXT PRIMARY KEY,
  todo_id TEXT,
  title TEXT NOT NULL,
  category TEXT,
  date TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  memo TEXT,
  FOREIGN KEY (todo_id) REFERENCES todos(id)
);
```

## 9.4 recurring_task_rules

```sql
CREATE TABLE recurring_task_rules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  frequency TEXT NOT NULL,
  day_of_week INTEGER,
  day_of_month INTEGER,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
```

---

# 10. React 컴포넌트 구조 제안

```text
src/
  renderer/
    pages/
      DashboardPage.tsx
      TodoPage.tsx
      CalendarPage.tsx
      WorkLogPage.tsx
      SettingsPage.tsx

    components/
      todo/
        TodoList.tsx
        TodoCard.tsx
        TodoFormModal.tsx
        TodoStatusColumn.tsx

      timer/
        TimerPanel.tsx
        TimerButton.tsx
        ActiveTimerBar.tsx

      calendar/
        CalendarMonthView.tsx
        CalendarWeekView.tsx
        CalendarDayPanel.tsx
        CalendarTodoItem.tsx

      worklog/
        WorkLogList.tsx
        WorkLogItem.tsx
        WorkLogSummary.tsx

    hooks/
      useTodos.ts
      useTimer.ts
      useWorkLogs.ts
      useCalendar.ts

    services/
      todoService.ts
      timerService.ts
      workLogService.ts
      recurringTaskService.ts
```

---

# 11. IPC / Backend 기능 제안

Electron + React + SQLite 기준으로, 렌더러에서 직접 DB를 만지지 않고 IPC를 통해 처리하는 구조를 권장한다.

## 11.1 Todo IPC

```text
todo:create
todo:update
todo:delete
todo:listByDate
todo:listAll
todo:changeStatus
```

## 11.2 Timer IPC

```text
timer:start
timer:pause
timer:resume
timer:finish
timer:getActive
```

## 11.3 Work Log IPC

```text
worklog:listByDate
worklog:listByRange
worklog:getSummary
```

## 11.4 Calendar IPC

```text
calendar:getMonthData
calendar:getWeekData
calendar:getDayDetail
```

---

# 12. 개발 순서

## Step 1. Todo CRUD 구현

- Todo 추가
- Todo 수정
- Todo 삭제
- 상태 변경
- 오늘 Todo 목록 표시

## Step 2. Dashboard에 오늘 Todo 표시

- 오늘 해야 할 일
- 진행 중
- 완료 목록

## Step 3. Timer 구현

- Todo별 시작 버튼
- 실행 중 타이머 표시
- 완료 시 시간 저장

## Step 4. Work Log 자동 생성

- Timer 종료 시 Work Log 생성
- 날짜별 업무 로그 조회

## Step 5. Calendar 구현

- 월간 보기
- 날짜별 Todo 표시
- 날짜 클릭 시 상세 패널 표시

## Step 6. 반복 업무 구현

- 반복 업무 규칙 등록
- 앱 실행 시 오늘 Todo 자동 생성

---

# 13. MVP 범위 조정

2단계에서도 처음부터 모든 기능을 만들 필요는 없다.

## 13.1 2단계 최소 MVP

```text
Todo 직접 입력
Todo 상태 변경
Todo별 타이머 시작/종료
업무 로그 자동 저장
오늘 Dashboard 표시
```

## 13.2 2단계 확장 기능

```text
캘린더 월간 보기
반복 업무 자동 생성
업무 카테고리별 통계
주간/월간 업무 시간 리포트
```

---

# 14. UI 디자인 방향

## 14.1 전체 톤

- 업무용
- 깔끔함
- 정보가 한눈에 보이는 구조
- Apple Calendar처럼 단순하지만, To-do 기능은 더 강하게

## 14.2 피해야 할 방향

- 일정만 빽빽한 캘린더
- 너무 많은 색상
- 너무 복잡한 프로젝트 관리 툴 느낌
- 처음부터 Notion이나 Jira처럼 무거운 구조

## 14.3 추천 방향

```text
Apple Calendar의 깔끔함
+
Todoist의 빠른 할 일 입력
+
Linear의 상태 관리
+
간단한 업무 타이머
```

---

# 15. opencode 작업 프롬프트 예시

아래 프롬프트를 opencode에 넣어 2단계 기능 구현을 시작한다.

```text
CM Assistant 프로젝트에 2단계 기능으로 Todo, Timer, Work Log, Calendar 기능을 추가해줘.

핵심 방향은 캘린더 중심이 아니라 오늘 할 일 중심이야.

우선 구현 범위:
1. Todo 직접 입력 / 수정 / 삭제
2. Todo 상태 관리: 진행 전, 진행 중, 완료, 보류
3. Todo별 타이머 시작 / 종료
4. 타이머 종료 시 Work Log 자동 생성
5. Dashboard에 오늘 Todo, 진행 중 업무, 완료 업무, 오늘 총 작업 시간 표시
6. CalendarPage는 우선 월간 보기만 만들고, 날짜별 Todo 개수와 제목 일부를 보여줘

기술 방향:
- Electron + React 기반
- 로컬 SQLite 저장
- 개인정보 서버 업로드 없음
- 렌더러에서 직접 DB 접근하지 말고 IPC 또는 service layer를 통해 처리

필요한 파일:
- TodoPage.tsx
- DashboardPage.tsx 업데이트
- CalendarPage.tsx
- WorkLogPage.tsx
- Todo 관련 컴포넌트
- Timer 관련 컴포넌트
- SQLite 테이블 생성 코드
- todoService / timerService / workLogService

UI는 깔끔한 업무용 스타일로 만들어줘.
처음부터 복잡하게 만들지 말고, 2단계 MVP가 동작하는 것을 우선으로 해줘.
```

---

# 16. 최종 요약

CM Assistant의 캘린더 기능은 일반 캘린더 앱처럼 만드는 것이 아니라, 다음 구조로 설계한다.

```text
오늘의 할 일
↓
업무 상태 관리
↓
타이머
↓
업무 로그
↓
캘린더에서 날짜별 확인
```

가장 중요한 것은 사용자가 매일 바뀌는 업무를 직접 입력하고, 실제로 얼마나 걸렸는지 기록하며, 나중에 날짜별로 업무를 되돌아볼 수 있게 만드는 것이다.
