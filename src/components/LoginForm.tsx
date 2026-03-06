"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Login failed.");
      }

      window.location.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="panel">
      <h1>Combat Nutrition Log Updater</h1>
      <p className="muted">Sign in to submit a daily log entry to GitHub.</p>
      <form onSubmit={onSubmit} className="stack">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </section>
  );
}
