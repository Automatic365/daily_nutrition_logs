import { NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/auth";
import { buildCanonicalDailyRecord, emptyDailyRecordDraft, inspectDailyRecordDraft } from "@/lib/dailyRecord";
import { isConflictError, readDailyLogFile, writeDailyLogFile } from "@/lib/github";
import { parseAndNormalizeEntry, upsertDailyLogEntry } from "@/lib/logParser";
import type { SubmitLogRequest, SubmitLogResponse, UpdateAction } from "@/lib/types";

const MAX_WRITE_ATTEMPTS = 2;

function parseBody(body: unknown): SubmitLogRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.");
  }

  const { draft, confirmed } = body as { draft?: unknown; confirmed?: unknown };

  if (confirmed !== true) {
    throw new Error("Explicit confirmation is required before writing the daily log.");
  }

  if (!draft || typeof draft !== "object") {
    throw new Error("Field `draft` must be an object.");
  }

  const candidate = draft as Record<string, unknown>;
  for (const field of Object.keys(emptyDailyRecordDraft())) {
    if (typeof candidate[field] !== "string") {
      throw new Error(`Draft field \`${field}\` must be a string.`);
    }
  }

  return { draft: draft as SubmitLogRequest["draft"], confirmed: true };
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: SubmitLogRequest;

  try {
    payload = parseBody(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request body." },
      { status: 400 }
    );
  }

  let date: string;
  let normalizedEntry: string;

  try {
    const issues = inspectDailyRecordDraft(payload.draft);
    if (issues.some((issue) => issue.severity === "invalid")) {
      throw new Error("Correct invalid values before confirming the daily record.");
    }
    const parsed = parseAndNormalizeEntry(buildCanonicalDailyRecord(payload.draft), payload.draft.entryDate);
    date = parsed.date;
    normalizedEntry = parsed.entry;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid entry format." },
      { status: 400 }
    );
  }

  let action: UpdateAction | null = null;

  for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt += 1) {
    try {
      const currentFile = await readDailyLogFile();
      const upserted = upsertDailyLogEntry(currentFile.content, normalizedEntry, date);

      action = upserted.action;

      if (upserted.content === currentFile.content) {
        return NextResponse.json({ error: "No changes detected for this submission." }, { status: 409 });
      }

      const commitMessage = `Update daily log for ${date} (${upserted.action})`;
      const commit = await writeDailyLogFile({
        content: upserted.content,
        sha: currentFile.sha,
        message: commitMessage
      });

      const response: SubmitLogResponse = {
        date,
        action: upserted.action,
        commitSha: commit.commitSha,
        commitUrl: commit.commitUrl,
        committedAt: new Date().toISOString(),
        message: commitMessage
      };

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      if (isConflictError(error) && attempt < MAX_WRITE_ATTEMPTS) {
        continue;
      }

      if (isConflictError(error)) {
        return NextResponse.json(
          {
            error: "GitHub write conflict after retry. Please resubmit.",
            date,
            action
          },
          { status: 409 }
        );
      }

      console.error("Failed to submit log update", error);
      return NextResponse.json({ error: "Failed to update log on GitHub." }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Unknown write failure." }, { status: 500 });
}
