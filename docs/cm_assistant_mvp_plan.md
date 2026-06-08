# CM Assistant 1차 MVP 개발 명세서

## 0. 프로젝트 개요

### 프로젝트명
CM Assistant

### 목표
행정팀이 매일 반복적으로 수행하는 출결 관련 업무를 자동화하는 데스크톱 프로그램을 만든다.

1차 MVP의 핵심 목표는 다음과 같다.

- 엑셀 파일을 불러와 출결 데이터를 분석한다.
- 출석, 지각, 외출, 조퇴, 결석, 휴공가, QR 미촬영 등을 자동 집계한다.
- 출석률을 자동 계산한다.
- 버튼을 누르면 Slack에 바로 붙여넣을 수 있는 출결현황보고 멘트를 자동 출력한다.
- 버튼을 누르면 현재 날짜와 현재 시간 기준의 불시점검 멘트를 자동 출력한다.
- 생성된 멘트는 복사 버튼으로 바로 클립보드에 복사할 수 있다.

---

## 1. 플랫폼 및 기술 방향

### 개발 환경
- macOS에서 개발한다.

### 사용 환경
- Windows 사용자를 대상으로 배포한다.
- 최종적으로 Windows용 `.exe` 또는 설치 파일을 생성할 수 있어야 한다.

### 권장 기술 스택

#### Desktop Framework
- Electron

#### Frontend
- React
- TypeScript 권장

#### 분석 엔진
- Python
- 엑셀 분석은 Python 기반으로 처리하는 것을 우선 고려한다.
- 필요 라이브러리 예시:
  - pandas
  - openpyxl

#### 로컬 저장소
- 1차 MVP에서는 필수 아님.
- 추후 Todo, 타이머, 업무 로그 기능 추가 시 SQLite 사용 예정.

#### 배포 방식
- macOS에서 개발 후 GitHub Actions를 통해 Windows 빌드 생성
- 목표:
  - macOS 개발
  - GitHub Actions Windows runner에서 `.exe` 빌드

---

## 2. 개인정보 처리 원칙

### 기본 원칙
개인정보는 서버에 업로드하지 않는다.

이 프로그램은 웹서비스가 아니라 로컬 데스크톱 프로그램으로 동작한다.
엑셀 파일에 포함된 개인정보는 사용자의 PC 내부에서만 처리한다.

### 서버 저장 금지 데이터
다음 데이터는 서버에 저장하지 않는다.

- 수강생 이름 원본
- 주민등록번호 앞자리
- 전화번호
- 이메일
- 개인 식별 가능한 민감 정보

### 1차 MVP 저장 정책
1차 MVP에서는 별도의 서버 저장 기능을 만들지 않는다.
엑셀 파일은 사용자가 선택한 로컬 파일만 읽는다.
분석 결과는 화면에만 출력한다.

---

## 3. 1차 MVP 핵심 기능

## 3-1. 엑셀 파일 불러오기

### 목적
사용자가 출결 관련 엑셀 파일을 선택하면 프로그램이 해당 파일을 읽는다.

### UI 요구사항
- `[엑셀 파일 불러오기]` 버튼 제공
- 선택된 파일명 표시
- 파일 읽기 실패 시 에러 메시지 표시

### 예외 처리
- 엑셀 파일이 아닌 경우 안내
- 파일이 열려 있거나 손상된 경우 안내
- 필수 컬럼을 찾지 못한 경우 안내

---

## 3-2. 출결 자동 분석

### 목적
엑셀 데이터를 분석하여 오늘 출결 현황을 자동 집계한다.

### 집계 항목
- 전체 인원
- 출석 인원
- 결석 인원
- 지각 인원
- 외출 인원
- 조퇴 인원
- 휴공가 인원
- 퇴실 QR 미촬영 인원
- 출석입력요청 검토 대상 건수
- 출석입력요청 검토 결과

### UI 요구사항
- `[출결 분석하기]` 버튼 제공
- 분석 결과 요약 카드 표시

예시:

```text
전체 인원: 36명
출석: 35명
지각: 0명
외출: 1명
조퇴: 0명
휴공가: 1명
결석: 0명
퇴실 QR 미촬영: 1명
출석률: 97.2%
```

---

## 3-3. 출석률 계산

### 목적
전체 인원 대비 출석률을 자동 계산한다.

### 기본 계산식
정확한 계산식은 실제 운영 기준에 맞춰 조정 가능하다.
우선 1차 MVP에서는 아래 기준을 기본값으로 둔다.

```text
출석률 = 출석 인원 / 전체 인원 * 100
```

### 주의
휴공가, 지각, 조퇴, 외출을 출석률 계산에 어떻게 반영할지는 추후 운영 기준에 맞게 설정 가능하도록 확장한다.
1차 MVP에서는 우선 단순 계산으로 시작한다.

---

## 3-4. 출결현황보고 멘트 자동 출력

### 중요도
1차 MVP에서 가장 중요한 기능이다.

### 동작 방식
자동으로 화면에 바로 출력하지 않는다.
사용자가 `[출결현황보고 멘트 생성]` 버튼을 눌렀을 때 생성한다.

### 요구사항
- 오늘 날짜 자동 반영
- 요일 자동 반영
- 기수명 반영
  - 1차 MVP에서는 사용자가 직접 입력 가능하게 한다.
  - 예: `PD_8기`
- 전체 인원 자동 반영
- 출석, QR 미촬영, 지각, 외출, 조퇴, 휴공가, 결석 자동 반영
- Slack에 붙여넣어도 양식이 깨지지 않도록 plain text 기반으로 생성
- 생성된 멘트는 `[복사하기]` 버튼으로 복사 가능

### 출력 예시

```text
[PD_8기] 6/8(월) 최종 출결 현황 공유(전체 36명)
- 출석: 35명
- 퇴실 QR 미촬영: 1명(성은채 DM완)
- 지각/외출/조퇴: 1명
 - 외출 : 1명(이다윤 13:10~16:12)
 - 지각 : 0명
 - 조퇴 : 0명

- 휴공가: 1명(박상훈 예비군)
- 결석: 0명

출석입력요청 검토 결과 
- 검토 대상 : 0건
- 검토 결과 : 이상 없음
```

### Slack 마크다운 기준
- Slack에서 그대로 읽기 쉬운 plain text 형식을 우선 사용한다.
- 굵은 글씨 등 과한 마크다운은 1차 MVP에서는 사용하지 않는다.
- 줄바꿈, 들여쓰기, 하이픈 구조를 안정적으로 유지한다.

---

## 3-5. 불시점검 멘트 자동 출력

### 목적
현재 시점 기준으로 불시점검 보고 멘트를 빠르게 생성한다.

### 동작 방식
사용자가 `[불시점검 멘트 생성]` 버튼을 눌렀을 때 생성한다.

### 요구사항
- 오늘 날짜 자동 반영
- 현재 시간 자동 반영
- 요일 자동 반영
- 기수명 반영
- 현재 엑셀 분석 결과를 기반으로 가능한 항목 자동 반영
- Slack에 붙여넣을 수 있는 plain text 양식으로 출력
- `[복사하기]` 버튼으로 복사 가능

### 출력 예시

```text
[PD_8기] 6/8(월) 14:32 불시점검 현황 공유

- 현재 출석 인원: 35명
- 이탈/미확인 인원: 1명
- 지각/외출/조퇴 현황: 1명
 - 외출 : 1명(이다윤 13:10~16:12)
 - 지각 : 0명
 - 조퇴 : 0명

- 특이사항: 없음
- 조치사항: 없음
```

### 1차 MVP 주의사항
불시점검 멘트의 정확한 양식은 실제 운영하면서 수정될 수 있다.
따라서 템플릿 문자열을 코드 안에 하드코딩하더라도 나중에 수정하기 쉬운 구조로 분리한다.

---

## 3-6. 복사 기능

### 목적
생성된 멘트를 Slack에 바로 붙여넣을 수 있게 한다.

### 요구사항
- 생성된 멘트 하단에 `[복사하기]` 버튼 제공
- 클릭 시 클립보드에 전체 텍스트 복사
- 복사 성공 시 `복사되었습니다` 메시지 표시

---

## 4. 1차 MVP 화면 구조

## 4-1. 기본 레이아웃

```text
┌──────────────────────────────────────┐
│ CM Assistant                          │
├──────────────────────────────────────┤
│ [기수명 입력: PD_8기]                 │
│                                      │
│ [엑셀 파일 불러오기]                  │
│ 선택된 파일: attendance.xlsx          │
│                                      │
│ [출결 분석하기]                       │
│                                      │
│ 분석 결과 요약                        │
│ - 전체 인원: 36명                     │
│ - 출석: 35명                          │
│ - 지각: 0명                           │
│ - 외출: 1명                           │
│ - 조퇴: 0명                           │
│ - 휴공가: 1명                         │
│ - 결석: 0명                           │
│ - 출석률: 97.2%                       │
│                                      │
│ [출결현황보고 멘트 생성]               │
│ [불시점검 멘트 생성]                  │
│                                      │
│ 생성된 멘트                           │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ │ Slack에 붙여넣을 텍스트           │ │
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [복사하기]                           │
└──────────────────────────────────────┘
```

---

## 5. 데이터 구조 초안

### AttendanceSummary

```ts
interface AttendanceSummary {
  cohortName: string;
  date: string;
  dayOfWeek: string;
  totalCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  outingCount: number;
  earlyLeaveCount: number;
  officialLeaveCount: number;
  qrMissingCount: number;
  attendanceRate: number;
  qrMissingPeople: PersonNote[];
  outingPeople: PersonTimeNote[];
  latePeople: PersonTimeNote[];
  earlyLeavePeople: PersonTimeNote[];
  officialLeavePeople: PersonNote[];
  absentPeople: PersonNote[];
  reviewRequestCount: number;
  reviewResultText: string;
}

interface PersonNote {
  name: string;
  note?: string;
}

interface PersonTimeNote {
  name: string;
  time?: string;
  note?: string;
}
```

---

## 6. 템플릿 함수 초안

### 출결현황보고 멘트 생성 함수

```ts
function generateDailyAttendanceReport(summary: AttendanceSummary): string {
  return `[
${summary.cohortName}] ${summary.date}(${summary.dayOfWeek}) 최종 출결 현황 공유(전체 ${summary.totalCount}명)
- 출석: ${summary.presentCount}명
- 퇴실 QR 미촬영: ${summary.qrMissingCount}명${formatPeopleInline(summary.qrMissingPeople)}
- 지각/외출/조퇴: ${summary.lateCount + summary.outingCount + summary.earlyLeaveCount}명
 - 외출 : ${summary.outingCount}명${formatPeopleInline(summary.outingPeople)}
 - 지각 : ${summary.lateCount}명${formatPeopleInline(summary.latePeople)}
 - 조퇴 : ${summary.earlyLeaveCount}명${formatPeopleInline(summary.earlyLeavePeople)}

- 휴공가: ${summary.officialLeaveCount}명${formatPeopleInline(summary.officialLeavePeople)}
- 결석: ${summary.absentCount}명${formatPeopleInline(summary.absentPeople)}

출석입력요청 검토 결과 
- 검토 대상 : ${summary.reviewRequestCount}건
- 검토 결과 : ${summary.reviewResultText}`;
}
```

주의: 위 코드는 초안이며 실제 줄바꿈과 문자열 처리는 구현 중 정리한다.

### 불시점검 멘트 생성 함수

```ts
function generateSpotCheckReport(summary: AttendanceSummary, currentTime: string): string {
  return `[${summary.cohortName}] ${summary.date}(${summary.dayOfWeek}) ${currentTime} 불시점검 현황 공유

- 현재 출석 인원: ${summary.presentCount}명
- 이탈/미확인 인원: ${summary.qrMissingCount}명${formatPeopleInline(summary.qrMissingPeople)}
- 지각/외출/조퇴 현황: ${summary.lateCount + summary.outingCount + summary.earlyLeaveCount}명
 - 외출 : ${summary.outingCount}명${formatPeopleInline(summary.outingPeople)}
 - 지각 : ${summary.lateCount}명${formatPeopleInline(summary.latePeople)}
 - 조퇴 : ${summary.earlyLeaveCount}명${formatPeopleInline(summary.earlyLeavePeople)}

- 특이사항: 없음
- 조치사항: 없음`;
}
```

---

## 7. 추천 프로젝트 구조

```text
cm-assistant/
  README.md
  package.json
  electron/
    main.ts
    preload.ts
  src/
    App.tsx
    components/
      FilePicker.tsx
      SummaryCard.tsx
      ReportGenerator.tsx
      CopyButton.tsx
    lib/
      date.ts
      reportTemplates.ts
      clipboard.ts
    types/
      attendance.ts
  python/
    analyze_attendance.py
    requirements.txt
  build/
  .github/
    workflows/
      windows-build.yml
```

---

## 8. 개발 순서

### Step 1. Electron + React 기본 앱 생성
- 앱 실행 확인
- 기본 화면 구성

### Step 2. 기수명 입력 UI 구현
- cohortName state 관리

### Step 3. 엑셀 파일 선택 기능 구현
- Electron file dialog 사용
- 선택한 파일 경로 표시

### Step 4. Python 분석 스크립트 연결
- 선택한 엑셀 파일 경로를 Python 스크립트에 전달
- Python이 JSON 형태로 분석 결과 반환

### Step 5. 분석 결과 화면 표시
- AttendanceSummary 형태로 변환
- 요약 카드 표시

### Step 6. 출결현황보고 멘트 생성 버튼 구현
- 버튼 클릭 시 템플릿 함수 실행
- 생성 텍스트 화면 출력

### Step 7. 불시점검 멘트 생성 버튼 구현
- 버튼 클릭 시 현재 시간 계산
- 템플릿 함수 실행
- 생성 텍스트 화면 출력

### Step 8. 복사 버튼 구현
- 클립보드 복사
- 성공 메시지 표시

### Step 9. Windows 빌드 설정
- electron-builder 또는 electron-forge 사용
- GitHub Actions Windows 빌드 구성

---

## 9. 1차 MVP에서 제외할 기능

아래 기능은 1차 MVP 이후로 미룬다.

- 로그인
- 서버 저장
- GM 대시보드
- 팀원 공유 기능
- Todo
- 타이머
- 업무 로그
- 캘린더
- AI 문서 분석
- PDF 분석
- HRD 자동 입력
- SQLite 저장

---

## 10. 추후 확장 예정 기능

### 2차
- Todo 직접 입력
- 업무 상태 관리
  - 진행 전
  - 진행 중
  - 완료
  - 보류
- 타이머
- 업무 로그

### 3차
- 캘린더 탭
- 날짜별 Todo 표시
- 반복 업무 등록
- 마감일 관리

### 4차
- PDF 분석
- 휴공가 신청서 자동 정리
- 보고서 문장 생성
- AI 보조 기능

---

## 11. opencode 작업 지시 프롬프트

아래 내용을 opencode에게 전달하여 1차 MVP 개발을 시작한다.

```text
너는 Electron + React + TypeScript 기반 데스크톱 앱을 개발하는 시니어 개발자다.

목표는 CM Assistant 1차 MVP를 구현하는 것이다.

핵심 기능은 다음과 같다.

1. Windows에서 사용할 수 있는 데스크톱 앱 구조를 만든다.
2. macOS에서 개발 가능해야 한다.
3. Electron + React + TypeScript 프로젝트를 구성한다.
4. 사용자가 기수명을 입력할 수 있게 한다.
5. 사용자가 엑셀 파일을 선택할 수 있게 한다.
6. 선택한 엑셀 파일 경로를 Python 분석 스크립트로 전달한다.
7. Python 스크립트는 우선 mock JSON을 반환해도 된다.
8. React 화면에서 분석 결과를 요약 카드로 보여준다.
9. [출결현황보고 멘트 생성] 버튼을 만들고, 클릭 시 Slack에 붙여넣을 수 있는 보고 멘트를 생성한다.
10. [불시점검 멘트 생성] 버튼을 만들고, 클릭 시 현재 날짜와 현재 시간을 반영한 불시점검 멘트를 생성한다.
11. 생성된 멘트를 textarea 또는 pre 영역에 표시한다.
12. [복사하기] 버튼으로 클립보드에 복사할 수 있게 한다.
13. 개인정보는 서버로 전송하지 않는다.
14. 1차 MVP에서는 로그인, 서버, DB, AI 기능은 만들지 않는다.

우선 다음 순서로 작업해라.

1. 프로젝트 초기 구조 생성
2. Electron main/preload 구성
3. React UI 구성
4. 타입 정의 작성
5. mock AttendanceSummary 데이터 생성
6. 출결현황보고 템플릿 함수 작성
7. 불시점검 템플릿 함수 작성
8. 복사 기능 구현
9. Python 분석 스크립트는 mock JSON 반환 형태로 추가
10. 이후 실제 엑셀 분석 로직을 붙일 수 있도록 구조를 분리

완료 후 실행 방법과 다음 작업 목록을 README.md에 정리해라.
```

---

## 12. 최종 1차 MVP 정의

1차 MVP는 다음 흐름이 가능하면 완료로 본다.

```text
프로그램 실행
↓
기수명 입력
↓
엑셀 파일 선택
↓
출결 분석하기 클릭
↓
분석 결과 확인
↓
출결현황보고 멘트 생성 클릭
또는
불시점검 멘트 생성 클릭
↓
생성된 Slack 문구 확인
↓
복사하기 클릭
↓
Slack에 붙여넣기
```

