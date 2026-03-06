"use client";

import { FormEvent, useState } from "react";
import { CommitSummaryCard } from "@/components/CommitSummaryCard";
import type { SubmitLogResponse } from "@/lib/types";

export function LogSubmitForm() {
  const [markdown, setMarkdown] = useState("");
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
        body: JSON.stringify({ markdown })
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
          Paste a full entry block starting with <code>## YYYY-MM-DD — Day</code>. The app will replace that
          date if present, otherwise append a new entry.
        </p>

        <form className="stack" onSubmit={onSubmit}>
          <label htmlFor="markdown">Daily Entry Markdown</label>
          <textarea
            id="markdown"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            placeholder="## 2026-03-06 — Friday\n\n### Tier\nTier 1..."
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
