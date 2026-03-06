import { afterEach, describe, expect, it, vi } from "vitest";
import { parseAndNormalizeEntry, upsertDailyLogEntry } from "@/lib/logParser";

const SOURCE = `# Daily Log — Long Term Memory

## 2026-03-05 — Thursday

### Tier
Tier 1

## 2026-03-06 — Friday

### Tier
Tier 2
`;

describe("parseAndNormalizeEntry", () => {
  it("extracts date from a valid header", () => {
    const entry = parseAndNormalizeEntry("## 2026-03-07 — Saturday\n\n### Tier\nTier 3");
    expect(entry.date).toBe("2026-03-07");
    expect(entry.entry.startsWith("## 2026-03-07 — Saturday")).toBe(true);
  });

  it("accepts hyphen separator in provided header", () => {
    const entry = parseAndNormalizeEntry("## 2026-03-07 - Saturday\n\n### Tier\nTier 3");
    expect(entry.date).toBe("2026-03-07");
    expect(entry.entry.startsWith("## 2026-03-07 - Saturday")).toBe(true);
  });

  it("prepends today's header when missing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T15:30:00.000Z"));
    process.env.APP_TIMEZONE = "UTC";

    const entry = parseAndNormalizeEntry("### Tier\nTier 3");

    expect(entry.date).toBe("2026-03-08");
    expect(entry.entry.startsWith("## 2026-03-08 — Sunday")).toBe(true);
    expect(entry.entry).toContain("### Tier\nTier 3");
  });

  it("prepends selected-date header when missing", () => {
    const entry = parseAndNormalizeEntry("### Tier\nTier 2", "2026-03-06");

    expect(entry.date).toBe("2026-03-06");
    expect(entry.entry.startsWith("## 2026-03-06 — Friday")).toBe(true);
  });

  it("rejects invalid selected-date format", () => {
    expect(() => parseAndNormalizeEntry("### Tier\nTier 2", "03-06-2026")).toThrow(
      "Field `entryDate` must be in YYYY-MM-DD format."
    );
  });
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.APP_TIMEZONE;
});

describe("upsertDailyLogEntry", () => {
  it("replaces an existing date block", () => {
    const replacement = "## 2026-03-06 — Friday\n\n### Tier\nTier 1";
    const result = upsertDailyLogEntry(SOURCE, replacement, "2026-03-06");

    expect(result.action).toBe("replaced");
    expect(result.content).toContain("Tier 1");
    expect(result.content).not.toContain("Tier 2");
    expect(result.content).toContain("## 2026-03-05 — Thursday");
  });

  it("appends when date does not exist", () => {
    const entry = "## 2026-03-08 — Sunday\n\n### Tier\nTier 3";
    const result = upsertDailyLogEntry(SOURCE, entry, "2026-03-08");

    expect(result.action).toBe("appended");
    expect(result.content.trimEnd().endsWith("Tier 3")).toBe(true);
  });
});
