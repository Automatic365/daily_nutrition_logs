import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockIsAuthorizedRequest = vi.fn();
const mockReadDailyLogFile = vi.fn();
const mockWriteDailyLogFile = vi.fn();
const mockIsConflictError = vi.fn();

vi.mock("@/lib/auth", () => ({
  isAuthorizedRequest: (request: Request) => mockIsAuthorizedRequest(request)
}));

vi.mock("@/lib/github", () => ({
  readDailyLogFile: () => mockReadDailyLogFile(),
  writeDailyLogFile: (params: unknown) => mockWriteDailyLogFile(params),
  isConflictError: (error: unknown) => mockIsConflictError(error)
}));

import { POST } from "@/app/api/logs/submit/route";

const validMarkdown = "## 2026-03-06 — Friday\n\n### Tier\nTier 1";
const bodyOnlyMarkdown = "### Tier\nTier 1";

describe("POST /api/logs/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.APP_TIMEZONE;
  });

  it("rejects unauthenticated requests", async () => {
    mockIsAuthorizedRequest.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/logs/submit", {
        method: "POST",
        body: JSON.stringify({ markdown: validMarkdown })
      })
    );

    expect(response.status).toBe(401);
    expect(mockReadDailyLogFile).not.toHaveBeenCalled();
  });

  it("submits successfully", async () => {
    mockIsAuthorizedRequest.mockReturnValue(true);
    mockReadDailyLogFile.mockResolvedValue({
      content: "## 2026-03-05 — Thursday\n\n### Tier\nTier 2\n",
      sha: "sha-one"
    });
    mockWriteDailyLogFile.mockResolvedValue({
      commitSha: "1234567890abcdef",
      commitUrl: "https://github.com/example/repo/commit/123"
    });
    mockIsConflictError.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/logs/submit", {
        method: "POST",
        body: JSON.stringify({ markdown: validMarkdown, entryDate: "2026-03-06" })
      })
    );

    const payload = (await response.json()) as { action?: string; commitSha?: string };

    expect(response.status).toBe(200);
    expect(payload.action).toBe("appended");
    expect(payload.commitSha).toBe("1234567890abcdef");
    expect(mockWriteDailyLogFile).toHaveBeenCalledTimes(1);
  });

  it("prepends selected-date header when missing", async () => {
    mockIsAuthorizedRequest.mockReturnValue(true);
    mockReadDailyLogFile.mockResolvedValue({
      content: "## 2026-03-05 — Thursday\n\n### Tier\nTier 2\n",
      sha: "sha-one"
    });
    mockWriteDailyLogFile.mockResolvedValue({
      commitSha: "headeradded123",
      commitUrl: "https://github.com/example/repo/commit/headeradded123"
    });
    mockIsConflictError.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/logs/submit", {
        method: "POST",
        body: JSON.stringify({ markdown: bodyOnlyMarkdown, entryDate: "2026-03-10" })
      })
    );

    const payload = (await response.json()) as { date?: string; action?: string };

    expect(response.status).toBe(200);
    expect(payload.date).toBe("2026-03-10");
    expect(payload.action).toBe("appended");
    expect(mockWriteDailyLogFile).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid selected-date format", async () => {
    mockIsAuthorizedRequest.mockReturnValue(true);

    const response = await POST(
      new Request("http://localhost/api/logs/submit", {
        method: "POST",
        body: JSON.stringify({ markdown: bodyOnlyMarkdown, entryDate: "03-10-2026" })
      })
    );

    expect(response.status).toBe(400);
    expect(mockReadDailyLogFile).not.toHaveBeenCalled();
    expect(mockWriteDailyLogFile).not.toHaveBeenCalled();
  });

  it("retries once on conflict and succeeds", async () => {
    mockIsAuthorizedRequest.mockReturnValue(true);
    mockReadDailyLogFile
      .mockResolvedValueOnce({
        content: "## 2026-03-06 — Friday\n\n### Tier\nTier 2\n",
        sha: "stale-sha"
      })
      .mockResolvedValueOnce({
        content: "## 2026-03-06 — Friday\n\n### Tier\nTier 2\n",
        sha: "fresh-sha"
      });

    mockWriteDailyLogFile
      .mockRejectedValueOnce({ code: "CONFLICT" })
      .mockResolvedValueOnce({
        commitSha: "abcdef123456",
        commitUrl: "https://github.com/example/repo/commit/abc"
      });

    mockIsConflictError.mockImplementation((error: { code?: string }) => error?.code === "CONFLICT");

    const response = await POST(
      new Request("http://localhost/api/logs/submit", {
        method: "POST",
        body: JSON.stringify({ markdown: validMarkdown })
      })
    );

    expect(response.status).toBe(200);
    expect(mockReadDailyLogFile).toHaveBeenCalledTimes(2);
    expect(mockWriteDailyLogFile).toHaveBeenCalledTimes(2);
  });

  it("fails after retry conflict", async () => {
    mockIsAuthorizedRequest.mockReturnValue(true);
    mockReadDailyLogFile.mockResolvedValue({
      content: "## 2026-03-05 — Thursday\n\n### Tier\nTier 2\n",
      sha: "sha-one"
    });

    mockWriteDailyLogFile.mockRejectedValue({ code: "CONFLICT" });
    mockIsConflictError.mockImplementation((error: { code?: string }) => error?.code === "CONFLICT");

    const response = await POST(
      new Request("http://localhost/api/logs/submit", {
        method: "POST",
        body: JSON.stringify({ markdown: validMarkdown })
      })
    );

    expect(response.status).toBe(409);
    expect(mockWriteDailyLogFile).toHaveBeenCalledTimes(2);
  });
});
