import type { QuickMessageTemplate } from '../types/quickMessage';

export const QUICK_MESSAGE_TEMPLATES: QuickMessageTemplate[] = [
  {
    id: 'spot-check-notice',
    title: '불시점검',
    category: '불시점검',
    description: '불시점검 시작 전 수강생에게 공유할 안내 문구입니다.',
    generator: 'spotCheckNotice',
    refreshable: true,
    template: generateSpotCheckNoticeMessage()
  },
  {
    id: 'spot-check-follow-up',
    title: '불시점검 후속 조치',
    category: '불시점검',
    description: '15분 초과 미복귀자에게 보내는 디스코드 후속 안내 문구입니다.',
    generator: 'spotCheckFollowUp',
    refreshable: true,
    template: generateSpotCheckFollowUpMessage()
  },
  {
    id: 'spot-check-result',
    title: '불시점검 결과 보고',
    category: '불시점검',
    description: '불시점검 진행 후 내부 공유용 결과 보고 문구입니다.',
    generator: 'spotCheckResult',
    template: generateSpotCheckResultMessage()
  },
  {
    id: 'log-comparison',
    title: '로그 대조 결과 안내',
    category: '로그 대조 결과 안내',
    description: 'HRD/Zep 로그 대조 후 불일치 또는 정상 출석으로 출결 변경시 안내합니다.',
    generator: 'logComparison',
    template: ''
  },
  {
    id: 'unit-period-close',
    title: '단위기간 종료',
    category: '단위기간 종료',
    description: '단위기간 종료 시 Slack에 공유하는 기본 보고 문구 템플릿입니다.',
    template: `*[과정명_n기] n차 단위기간(훈련일수 n일)*
*- 출석률 50%미만* : 없음
*- 공가 사용자* : 0명`
  },
  {
    id: 'instructor-morning-attendance-share',
    title: '주강사 오전 출결 현황 공유',
    category: '강사 공유',
    description: '주강사님께 오전 출결 현황을 공유합니다.',
    savedKey: 'instructorMorningAttendanceShare',
    copyMode: 'plainText',
    template: `**[오전 출결현황 공유]**

강사님 안녕하세요.
금일 오전 출결 현황 공유드립니다.

- 출석:
- 지각:
- 외출:
- 조퇴:
- 결석:
- 특이사항:

세부 양식은 매니저님 스타일에 맞게 수정 후 저장해주세요.`
  },
  {
    id: 'instructor-afternoon-attendance-share',
    title: '주강사 오후 출결 현황 공유',
    category: '강사 공유',
    description: '주강사님께 오후 출결 현황을 공유합니다.',
    savedKey: 'instructorAfternoonAttendanceShare',
    copyMode: 'plainText',
    template: `**[오후 출결현황 공유]**

강사님 안녕하세요.
금일 오후 출결 현황 공유드립니다.

- 출석:
- 지각:
- 외출:
- 조퇴:
- 결석:
- 특이사항:

세부 양식은 매니저님 스타일에 맞게 수정 후 저장해주세요.`
  },
  {
    id: 'morning-greeting',
    title: '아침 인사 멘트',
    category: '인사',
    description: '오전 Zep 접속 시 수강생에게 안내할 문구나 인사 멘트를 자유롭게 작성해주세요.',
    savedKey: 'morningGreeting',
    template: `좋은 아침입니다.
출석(QR촬영)부탁드립니다. 오늘 커리큘럼을 확인해주세요!.`
  },
  {
    id: 'evening-greeting',
    title: '저녁 인사 멘트',
    category: '인사',
    description: '하루 마무리 시 수강생에게 안내할 문구나 인사 멘트를 자유롭게 작성해주세요.',
    savedKey: 'eveningGreeting',
    template: `오늘도 고생 많으셨습니다.
퇴실 전 QR 촬영과 셀프체크 부탁드립니다.`
  }
];

export function generateSpotCheckNoticeMessage(date = new Date()): string {
  const messages = generateSpotCheckNoticeMessages(date);

  return `< 안내 양식(디스코드 DM) >
${messages.discord}

< 안내 양식(Zep 채팅) >
${messages.zep}`;
}

export function generateSpotCheckNoticeMessages(date = new Date()): { discord: string; zep: string } {
  const today = `${date.getMonth() + 1}/${date.getDate()}`;
  const checkTime = formatTime(date);
  const returnTime = formatTime(addMinutes(date, 15));

  return {
    discord: `${today}, ${checkTime} 기준으로 수업 참여가 확인되지 않아 안내드립니다. ${returnTime} 까지 복귀하지 않으실 경우, ${checkTime}부터 복귀 시점까지 외출로 반영될 수 있습니다.
복귀시점은 이 DM에 주시는 답장을 기준으로 계산되니 복귀하셨다면 꼭 답장부탁드립니다. (15분 이하 자리비움은 출결에 영향을 주지 않습니다.)`,
    zep: `${today}, ${checkTime} 기준으로 수업 참여가 확인되지 않아 디스코드로 안내드렸으니 내용 확인 부탁드립니다!
※ 젭 채팅이력은 출결 증빙자료로 사용할 수 없는 관계로, 복귀 답장은 꼭 디스코드 DM으로 주시기 바랍니다.`
  };
}

export function generateSpotCheckFollowUpMessage(date = new Date()): string {
  const today = `${date.getMonth() + 1}/${date.getDate()}`;
  const deadlineTime = formatTime(date);
  const firstNoticeTime = formatTime(addMinutes(date, -15));

  return `< 안내 양식(디스코드 DM) >
00님! ${today} ${deadlineTime}까지 복귀가 확인되지 않아 최초 자리비움 확인된 ${firstNoticeTime}부터 복귀시점까지 외출로 처리될 예정입니다.
복귀시점은 이 DM에 주시는 답장을 기준으로 계산되니 복귀(젭 접속+얼굴 노출)하셨다면 꼭 답장 부탁드립니다.`;
}

export function generateSpotCheckResultMessage(date = new Date()): string {
  const reportDate = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}(${formatDayOfWeek(date)})`;

  return `*[0기] ${reportDate} n교시 불시점검 공유* (@행정지원매니저 태그)
- 점검 결과: 특이사항 00명`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDayOfWeek(date: Date): string {
  return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
}
