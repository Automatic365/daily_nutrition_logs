import { NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/auth";
import { buildCanonicalDailyRecord, inspectDailyRecordDraft } from "@/lib/dailyRecord";
import type { DailyRecordDraft } from "@/lib/dailyRecord";
import type { PreviewLogResponse } from "@/lib/types";

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { draft?: unknown };
    if (!body.draft || typeof body.draft !== "object") {
      return NextResponse.json({ error: "Field `draft` must be an object." }, { status: 400 });
    }

    const draft = body.draft as DailyRecordDraft;
    const issues = inspectDailyRecordDraft(draft);
    const hasInvalidDate = issues.some((issue) => issue.field === "entryDate" && issue.severity === "invalid");
    const response: PreviewLogResponse = {
      markdown: hasInvalidDate || !draft.entryDate ? "" : buildCanonicalDailyRecord(draft),
      issues
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
}
