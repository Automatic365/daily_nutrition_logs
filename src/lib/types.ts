import type { DailyRecordDraft, DraftIssue } from "@/lib/dailyRecord";

export type UpdateAction = "replaced" | "appended";

export interface SubmitLogRequest {
  draft: DailyRecordDraft;
  confirmed: true;
}

export interface SubmitLogResponse {
  date: string;
  action: UpdateAction;
  commitSha: string;
  commitUrl: string;
  committedAt: string;
  message: string;
}

export interface PreviewLogResponse {
  markdown: string;
  issues: DraftIssue[];
}
