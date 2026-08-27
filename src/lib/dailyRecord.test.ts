import { describe, expect, it } from "vitest";
import { buildCanonicalDailyRecord, emptyDailyRecordDraft, inspectDailyRecordDraft } from "@/lib/dailyRecord";

describe("daily record review", () => {
  it("flags missing conversation values instead of inventing them", () => {
    const issues = inspectDailyRecordDraft(emptyDailyRecordDraft("2026-08-27"));
    expect(issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(["status", "sleep", "calories", "protein", "fast", "adherenceScore", "bossMode", "bossOutcome"])
    );
    expect(issues.some((issue) => issue.field === "weight")).toBe(false);
  });

  it("renders the canonical App Parse Block and omits unavailable measurements", () => {
    const markdown = buildCanonicalDailyRecord({
      ...emptyDailyRecordDraft("2026-08-27"),
      status: "Pass",
      sleep: "7h 15m",
      calories: "1650",
      protein: "195",
      fast: "false",
      adherenceScore: "95",
      bossMode: "none",
      bossOutcome: "none"
    });

    expect(markdown).toContain("## 2026-08-27 — Thursday");
    expect(markdown).toContain("### App Parse Block");
    expect(markdown).toContain("Protein: 195g");
    expect(markdown).toContain("Boss Name: null");
    expect(markdown).not.toContain("Weight:");
    expect(markdown).not.toContain("Abdomen (navel):");
  });

  it("preserves uncertainty as unknown in the canonical record", () => {
    const markdown = buildCanonicalDailyRecord(emptyDailyRecordDraft("2026-08-27"));
    expect(markdown).toContain("Status: unknown");
    expect(markdown).toContain("Calories: unknown");
    expect(markdown).toContain("Fast: unknown");
  });

  it("rejects out-of-range values", () => {
    const issues = inspectDailyRecordDraft({
      ...emptyDailyRecordDraft("2026-08-27"),
      adherenceScore: "105"
    });
    expect(issues).toContainEqual({
      field: "adherenceScore",
      message: "Daily Adherence Score has an invalid value.",
      severity: "invalid"
    });
  });

  it("rejects zero protein on an eating day", () => {
    const issues = inspectDailyRecordDraft({
      ...emptyDailyRecordDraft("2026-08-27"),
      fast: "false",
      protein: "0"
    });
    expect(issues).toContainEqual({
      field: "protein",
      message: "Protein cannot be 0 on an eating day.",
      severity: "invalid"
    });
  });
});
