import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("POST /api/logs/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        body: JSON.stringify({ markdown: validMarkdown })
      })
    );

    const payload = (await response.json()) as { action?: string; commitSha?: string };

    expect(response.status).toBe(200);
    expect(payload.action).toBe("appended");
    expect(payload.commitSha).toBe("1234567890abcdef");
    expect(mockWriteDailyLogFile).toHaveBeenCalledTimes(1);
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
