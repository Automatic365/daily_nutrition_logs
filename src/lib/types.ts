export type UpdateAction = "replaced" | "appended";

export interface SubmitLogRequest {
  markdown: string;
}

export interface SubmitLogResponse {
  date: string;
  action: UpdateAction;
  commitSha: string;
  commitUrl: string;
  committedAt: string;
  message: string;
}
