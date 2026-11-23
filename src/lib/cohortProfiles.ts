import type { CohortProfile } from '../types/cohortProfile';

export const COHORT_COURSES = ['DA', 'FS', 'FESI', 'SB', 'PD', 'AI', 'IF'];

export function formatCohortProfile(profile: CohortProfile): string {
  return `${profile.course}_${profile.cohortNumber}기`;
}
