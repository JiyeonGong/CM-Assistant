import type { MemoTemplate } from '../types/appData';

export const BUILTIN_MEMO_TEMPLATES: MemoTemplate[] = [
  {
    id: 'builtin-handover',
    title: '인수인계 메모',
    content: '[인수인계]\n- 특이사항:\n- 확인 필요:\n- 다음 근무자 전달사항:'
  },
  {
    id: 'builtin-issue-note',
    title: '특이사항 메모',
    content: '[특이사항]\n- 대상:\n- 내용:\n- 조치:'
  },
  {
    id: 'builtin-followup',
    title: '후속 조치 체크',
    content: '[후속 조치]\n- 확인할 사람:\n- 확인할 내용:\n- 기한:'
  }
];
