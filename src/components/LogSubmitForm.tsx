"use client";

import { FormEvent, useState } from "react";
import { CommitSummaryCard } from "@/components/CommitSummaryCard";
import type { SubmitLogResponse } from "@/lib/types";

function getDefaultEntryDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function LogSubmitForm() {
  const [markdown, setMarkdown] = useState("");
  const [entryDate, setEntryDate] = useState(getDefaultEntryDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/logs/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, entryDate })
      });

      const payload = (await response.json()) as SubmitLogResponse | { error?: string };

      if (!response.ok) {
        const message = "error" in payload ? payload.error : "Submission failed.";
        throw new Error(message ?? "Submission failed.");
      }

      setResult(payload as SubmitLogResponse);
      setMarkdown("");
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
          <h1>Combat Nutrition Log Updater</h1>
          <button type="button" className="secondary" onClick={onLogout}>
            Sign Out
          </button>
        </div>
        <p className="muted">
          Select the entry date, then paste your markdown. If <code>## YYYY-MM-DD — Day</code> is missing, the app
          prepends a header using the selected date, then replaces that date if present or appends a new entry.
        </p>

        <form className="stack" onSubmit={onSubmit}>
          <label htmlFor="entryDate">Entry Date</label>
          <input
            id="entryDate"
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
            required
          />
          <label htmlFor="markdown">Daily Entry Markdown</label>
          <textarea
            id="markdown"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            placeholder="### Tier\nTier 1..."
            rows={16}
            required
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Update"}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </section>

      {result ? <CommitSummaryCard result={result} /> : null}
    </div>
  );
}
