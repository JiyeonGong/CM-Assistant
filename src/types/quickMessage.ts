export interface QuickMessageTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  template: string;
  generator?: 'spotCheckNotice' | 'spotCheckFollowUp' | 'spotCheckResult' | 'logComparison';
  savedKey?: 'morningGreeting' | 'eveningGreeting' | 'instructorAttendanceShare' | 'instructorMorningAttendanceShare' | 'instructorAfternoonAttendanceShare';
  copyMode?: 'plainText' | 'richText';
  refreshable?: boolean;
}
