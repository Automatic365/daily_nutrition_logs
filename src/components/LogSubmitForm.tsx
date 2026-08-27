"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CommitSummaryCard } from "@/components/CommitSummaryCard";
import { emptyDailyRecordDraft, inspectDailyRecordDraft } from "@/lib/dailyRecord";
import type { DailyRecordDraft, DailyRecordField } from "@/lib/dailyRecord";
import type { SubmitLogResponse } from "@/lib/types";

function getDefaultEntryDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getConversationPrefill(): Partial<DailyRecordDraft> {
  if (typeof window === "undefined") return {};
  const encoded = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("draft");
  if (!encoded) return {};
  try {
    const value = JSON.parse(encoded);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

const FIELD_LABELS: Record<DailyRecordField, string> = {
  entryDate: "Date", status: "Status", weight: "Weight (lb)", abdomenNavel: "Abdomen / navel (in)",
  waistPlus2: '+2\" (in)', waistMinus2: 'Below / −2\" (in)', sleep: "Sleep", calories: "Calories",
  protein: "Protein (g)", fast: "Fast", adherenceScore: "Adherence (0–100)", bossMode: "Boss Mode",
  bossName: "Boss Name", bossOutcome: "Boss Outcome"
};

const FIELD_GROUPS: DailyRecordField[][] = [
  ["entryDate", "status", "fast", "adherenceScore"],
  ["weight", "abdomenNavel", "waistPlus2", "waistMinus2"],
  ["sleep", "calories", "protein"],
  ["bossMode", "bossName", "bossOutcome"]
];

export function LogSubmitForm() {
  const [draft, setDraft] = useState<DailyRecordDraft>(() => emptyDailyRecordDraft(getDefaultEntryDate()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [result, setResult] = useState<SubmitLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const issues = useMemo(() => inspectDailyRecordDraft(draft), [draft]);
  const invalidIssues = issues.filter((issue) => issue.severity === "invalid");

  useEffect(() => {
    const prefill = getConversationPrefill();
    if (Object.keys(prefill).length > 0) {
      setDraft((current) => ({ ...current, ...prefill, entryDate: prefill.entryDate || current.entryDate }));
    }
  }, []);

  function updateField(field: DailyRecordField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setIsConfirmed(false);
    setResult(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConfirmed) {
      setError("Review the checklist and explicitly confirm it before writing the log.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/logs/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, confirmed: true })
      });
      const payload = (await response.json()) as SubmitLogResponse | { error?: string };
      if (!response.ok) throw new Error("error" in payload ? payload.error : "Submission failed.");
      setResult(payload as SubmitLogResponse);
      setIsConfirmed(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="stack-lg">
      <section className="panel">
        <div className="row">
          <div><p className="eyebrow">Goodnight review</p><h1>Confirm today&apos;s record</h1></div>
          <button type="button" className="secondary" onClick={onLogout}>Sign Out</button>
        </div>
        <p className="muted intro">
          Prefilled from today&apos;s conversation. Correct anything that is wrong; highlighted gaps stay visibly unknown and are never guessed.
        </p>

        <form className="stack" onSubmit={onSubmit}>
          {FIELD_GROUPS.map((group, groupIndex) => (
            <fieldset className="field-grid" key={groupIndex}>
              {group.map((field) => {
                const fieldIssue = issues.find((issue) => issue.field === field);
                const selectOptions = field === "status" ? ["Pass", "Fail"] : field === "fast" ? ["true", "false"] : null;
                return (
                  <label className={fieldIssue ? `field issue-${fieldIssue.severity}` : "field"} key={field}>
                    <span>{FIELD_LABELS[field]}</span>
                    {selectOptions ? (
                      <select value={draft[field]} onChange={(event) => updateField(field, event.target.value)}>
                        <option value="">Unknown</option>
                        {selectOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field === "entryDate" ? "date" : "text"}
                        inputMode={["weight", "abdomenNavel", "waistPlus2", "waistMinus2", "calories", "protein", "adherenceScore"].includes(field) ? "decimal" : undefined}
                        value={draft[field]}
                        placeholder={fieldIssue?.severity === "missing" ? "Unknown — review" : "Optional"}
                        onChange={(event) => updateField(field, event.target.value)}
                      />
                    )}
                    {fieldIssue ? <small>{fieldIssue.message}</small> : null}
                  </label>
                );
              })}
            </fieldset>
          ))}

          {issues.length > 0 ? (
            <div className="review-alert" role="status">
              <strong>{issues.length} item{issues.length === 1 ? "" : "s"} need attention.</strong>{" "}
              Missing values may remain unknown if they truly were not stated. Invalid values must be corrected.
            </div>
          ) : null}

          <label className="confirmation">
            <input type="checkbox" checked={isConfirmed} disabled={invalidIssues.length > 0}
              onChange={(event) => setIsConfirmed(event.target.checked)} />
            <span>I reviewed this record. Commit it to the canonical daily log.</span>
          </label>
          <button type="submit" disabled={isSubmitting || !isConfirmed || invalidIssues.length > 0}>
            {isSubmitting ? "Committing…" : "Confirm & commit"}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </section>
      {result ? <CommitSummaryCard result={result} /> : null}
    </div>
  );
}
