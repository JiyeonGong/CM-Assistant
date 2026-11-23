export interface CohortProfile {
  id: string;
  course: string;
  cohortNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface CohortProfileSettings {
  profiles: CohortProfile[];
  activeProfileId: string;
}

export interface CreateCohortProfileInput {
  course: string;
  cohortNumber: string;
}
