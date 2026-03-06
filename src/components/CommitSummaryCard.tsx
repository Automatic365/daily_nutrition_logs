import type { SubmitLogResponse } from "@/lib/types";

interface CommitSummaryCardProps {
  result: SubmitLogResponse;
}

export function CommitSummaryCard({ result }: CommitSummaryCardProps) {
  return (
    <section className="panel summary">
      <h2>Submission Complete</h2>
      <p>
        <strong>Date:</strong> {result.date}
      </p>
      <p>
        <strong>Action:</strong> {result.action}
      </p>
      <p>
        <strong>Commit:</strong>{" "}
        <a href={result.commitUrl} target="_blank" rel="noreferrer">
          {result.commitSha.slice(0, 10)}
        </a>
      </p>
      <p>
        <strong>Committed At:</strong> {new Date(result.committedAt).toLocaleString()}
      </p>
    </section>
  );
}
