export const STATUS_OPTIONS = ["Pass", "Fail"] as const;

export interface DailyRecordDraft {
  entryDate: string;
  status: string;
  weight: string;
  abdomenNavel: string;
  waistPlus2: string;
  waistMinus2: string;
  sleep: string;
  calories: string;
  protein: string;
  fast: "true" | "false" | "";
  adherenceScore: string;
  bossMode: string;
  bossName: string;
  bossOutcome: string;
}

export type DailyRecordField = keyof DailyRecordDraft;

export interface DraftIssue {
  field: DailyRecordField;
  message: string;
  severity: "missing" | "invalid";
}

const DATE_INPUT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function emptyDailyRecordDraft(entryDate = ""): DailyRecordDraft {
  return {
    entryDate,
    status: "",
    weight: "",
    abdomenNavel: "",
    waistPlus2: "",
    waistMinus2: "",
    sleep: "",
    calories: "",
    protein: "",
    fast: "",
    adherenceScore: "",
    bossMode: "",
    bossName: "",
    bossOutcome: ""
  };
}

function trimmedDraft(draft: DailyRecordDraft): DailyRecordDraft {
  return Object.fromEntries(
    Object.entries(draft).map(([key, value]) => [key, value.trim()])
  ) as unknown as DailyRecordDraft;
}

function isValidDate(dateText: string): boolean {
  if (!DATE_INPUT_REGEX.test(dateText)) return false;
  const [year, month, day] = dateText.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
}

function checkNumber(
  issues: DraftIssue[],
  draft: DailyRecordDraft,
  field: DailyRecordField,
  label: string,
  options: { required?: boolean; min?: number; max?: number } = {}
) {
  const value = draft[field];
  if (!value) {
    if (options.required) issues.push({ field, message: `${label} is missing or uncertain.`, severity: "missing" });
    return;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || (options.min !== undefined && number < options.min) || (options.max !== undefined && number > options.max)) {
    issues.push({ field, message: `${label} has an invalid value.`, severity: "invalid" });
  }
}

export function inspectDailyRecordDraft(rawDraft: DailyRecordDraft): DraftIssue[] {
  const draft = trimmedDraft(rawDraft);
  const issues: DraftIssue[] = [];

  if (!draft.entryDate) {
    issues.push({ field: "entryDate", message: "Date is missing.", severity: "missing" });
  } else if (!isValidDate(draft.entryDate)) {
    issues.push({ field: "entryDate", message: "Date must be a valid YYYY-MM-DD date.", severity: "invalid" });
  }

  if (!draft.status) {
    issues.push({ field: "status", message: "Status is missing or uncertain.", severity: "missing" });
  } else if (!STATUS_OPTIONS.includes(draft.status as (typeof STATUS_OPTIONS)[number])) {
    issues.push({ field: "status", message: "Status must be Pass or Fail.", severity: "invalid" });
  }

  checkNumber(issues, draft, "weight", "Weight", { min: 50, max: 500 });
  checkNumber(issues, draft, "abdomenNavel", "Abdomen (navel)", { min: 10, max: 100 });
  checkNumber(issues, draft, "waistPlus2", '+2" measurement', { min: 10, max: 100 });
  checkNumber(issues, draft, "waistMinus2", "Below measurement", { min: 10, max: 100 });
  checkNumber(issues, draft, "calories", "Calories", { required: true, min: 0, max: 20000 });
  checkNumber(issues, draft, "protein", "Protein", { required: true, min: 0, max: 1000 });
  checkNumber(issues, draft, "adherenceScore", "Daily Adherence Score", { required: true, min: 0, max: 100 });

  if (!draft.sleep) issues.push({ field: "sleep", message: "Sleep is missing or uncertain.", severity: "missing" });
  if (!draft.fast) issues.push({ field: "fast", message: "Fast status is missing or uncertain.", severity: "missing" });
  else if (draft.fast !== "true" && draft.fast !== "false") {
    issues.push({ field: "fast", message: "Fast must be true or false.", severity: "invalid" });
  }
  if (draft.fast === "false" && Number(draft.protein) === 0) {
    issues.push({ field: "protein", message: "Protein cannot be 0 on an eating day.", severity: "invalid" });
  }
  if (!draft.bossMode) issues.push({ field: "bossMode", message: "Boss Mode is missing or uncertain.", severity: "missing" });
  if (!draft.bossOutcome) issues.push({ field: "bossOutcome", message: "Boss Outcome is missing or uncertain.", severity: "missing" });

  return issues;
}

export function buildCanonicalDailyRecord(rawDraft: DailyRecordDraft): string {
  const draft = trimmedDraft(rawDraft);
  if (!isValidDate(draft.entryDate)) throw new Error("A valid entry date is required.");

  const [year, month, day] = draft.entryDate.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const lines = [
    `## ${draft.entryDate} — ${weekday}`,
    "",
    "### App Parse Block",
    `Status: ${draft.status || "unknown"}`
  ];

  if (draft.weight) lines.push(`Weight: ${draft.weight}`);
  if (draft.abdomenNavel) lines.push(`Abdomen (navel): ${draft.abdomenNavel}`);
  if (draft.waistPlus2) lines.push(`+2\": ${draft.waistPlus2}`);
  if (draft.waistMinus2) lines.push(`Below: ${draft.waistMinus2}`);

  lines.push(
    `Sleep: ${draft.sleep || "unknown"}`,
    `Calories: ${draft.calories || "unknown"}`,
    `Protein: ${draft.protein ? `${draft.protein}g` : "unknown"}`,
    `Fast: ${draft.fast || "unknown"}`,
    `Daily Adherence Score: ${draft.adherenceScore || "unknown"}`,
    `Boss Mode: ${draft.bossMode || "unknown"}`,
    `Boss Name: ${draft.bossName || "null"}`,
    `Boss Outcome: ${draft.bossOutcome || "unknown"}`
  );

  return lines.join("\n");
}
