import type { QuickMessageTemplate } from '../types/quickMessage';

export const QUICK_MESSAGE_TEMPLATES: QuickMessageTemplate[] = [
  {
    id: 'spot-check-notice',
    title: '불시점검 안내 멘트',
    category: '불시점검',
    description: '불시점검 시작 전 수강생에게 공유할 안내 문구입니다.',
    generator: 'spotCheckNotice',
    refreshable: true,
    template: generateSpotCheckNoticeMessage()
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
    id: 'spot-check-follow-up',
    title: '불시점검 후속 DM',
    category: '불시점검',
    description: '15분 초과 미복귀자에게 보내는 디스코드 후속 안내 문구입니다.',
    generator: 'spotCheckFollowUp',
    refreshable: true,
    template: generateSpotCheckFollowUpMessage()
  },
  {
    id: 'instructor-attendance-share',
    title: '출결현황공유(주강사)',
    category: '강사 공유',
    description: '주강사님께 공유할 출결 현황 문구입니다. 매니저별 양식으로 저장해 사용할 수 있습니다.',
    savedKey: 'instructorAttendanceShare',
    copyMode: 'plainText',
    template: `**[출결현황 공유]**

강사님 안녕하세요.
금일 출결 현황 공유드립니다.

- 전체 인원:
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
    description: '오전 시작 시 Slack에 공유할 인사 문구입니다.',
    savedKey: 'morningGreeting',
    template: `좋은 아침입니다.
오늘도 일정 확인 후 출석 체크 부탁드립니다.

세부 양식은 추후 확정 예정입니다.`
  },
  {
    id: 'evening-greeting',
    title: '저녁 인사 멘트',
    category: '인사',
    description: '하루 마무리 시 Slack에 공유할 인사 문구입니다.',
    savedKey: 'eveningGreeting',
    template: `오늘도 고생 많으셨습니다.
퇴실 전 QR 촬영과 제출 사항 확인 부탁드립니다.

세부 양식은 추후 확정 예정입니다.`
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
