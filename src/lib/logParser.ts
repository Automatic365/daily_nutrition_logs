import type { UpdateAction } from "@/lib/types";

const ENTRY_HEADER_REGEX = /^##\s*(\d{4}-\d{2}-\d{2})\s(?:—|-)\s.+$/;
const FILE_ENTRY_HEADER_REGEX = /^##\s*(\d{4}-\d{2}-\d{2})\s(?:—|-)\s.*$/gm;

export interface ParsedEntry {
  date: string;
  entry: string;
}

export interface UpsertResult {
  content: string;
  action: UpdateAction;
}

function normalizeNewlines(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

function getTodayHeader(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.APP_TIMEZONE ?? "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long"
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const weekday = parts.find((part) => part.type === "weekday")?.value;

  if (!year || !month || !day || !weekday) {
    throw new Error("Unable to derive current date header.");
  }

  return `## ${year}-${month}-${day} — ${weekday}`;
}

export function parseAndNormalizeEntry(markdown: string): ParsedEntry {
  const trimmed = normalizeNewlines(markdown).trim();

  if (!trimmed) {
    throw new Error("Submitted markdown cannot be empty.");
  }

  const firstLine = trimmed.split("\n")[0]?.trim() ?? "";
  const hasHeader = ENTRY_HEADER_REGEX.test(firstLine);
  const normalizedEntry = hasHeader ? trimmed : `${getTodayHeader()}\n\n${trimmed}`;
  const normalizedFirstLine = normalizedEntry.split("\n")[0]?.trim() ?? "";
  const match = normalizedFirstLine.match(ENTRY_HEADER_REGEX);

  if (!match?.[1]) {
    throw new Error("Entry must include or derive a valid date header.");
  }

  return {
    date: match[1],
    entry: normalizedEntry
  };
}

export function upsertDailyLogEntry(
  existingContent: string,
  normalizedEntry: string,
  date: string
): UpsertResult {
  const fileContent = normalizeNewlines(existingContent);
  const entryHeaders = Array.from(fileContent.matchAll(FILE_ENTRY_HEADER_REGEX));

  const targetIndex = entryHeaders.findIndex((match) => match[1] === date);

  if (targetIndex >= 0) {
    const target = entryHeaders[targetIndex];
    const start = target.index ?? 0;
    const end = entryHeaders[targetIndex + 1]?.index ?? fileContent.length;

    const before = fileContent.slice(0, start).replace(/\s*$/, "\n\n");
    const after = fileContent.slice(end).replace(/^\s*/, "");

    const updated = `${before}${normalizedEntry.trimEnd()}\n\n${after}`.trimEnd() + "\n";

    return {
      content: updated,
      action: "replaced"
    };
  }

  const appended = `${fileContent.trimEnd()}\n\n${normalizedEntry.trimEnd()}\n`;

  return {
    content: appended,
    action: "appended"
  };
}
