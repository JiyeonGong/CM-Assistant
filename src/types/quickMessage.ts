export interface QuickMessageTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  template: string;
  generator?: 'spotCheckNotice' | 'spotCheckFollowUp' | 'spotCheckResult';
  savedKey?: 'morningGreeting' | 'eveningGreeting' | 'instructorAttendanceShare';
  copyMode?: 'plainText' | 'richText';
  refreshable?: boolean;
}
