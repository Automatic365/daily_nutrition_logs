const GITHUB_API_BASE = "https://api.github.com";
const ALLOWED_TARGET_PATH = "daily_log.md";

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  targetPath: string;
}

interface GitHubContentResponse {
  content: string;
  sha: string;
}

interface GitHubWriteResponse {
  commit?: {
    sha?: string;
    html_url?: string;
  };
}

export class GitHubApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getConfig(): GitHubConfig {
  const targetPath = process.env.GITHUB_TARGET_PATH ?? ALLOWED_TARGET_PATH;

  if (targetPath !== ALLOWED_TARGET_PATH) {
    throw new Error(`Unsupported target path: ${targetPath}. Only ${ALLOWED_TARGET_PATH} is allowed.`);
  }

  return {
    token: getRequiredEnv("GITHUB_TOKEN"),
    owner: getRequiredEnv("GITHUB_OWNER"),
    repo: getRequiredEnv("GITHUB_REPO"),
    branch: process.env.GITHUB_BRANCH ?? "main",
    targetPath
  };
}

function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function fetchGitHubJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${getConfig().token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new GitHubApiError(response.status, bodyText || "GitHub request failed.");
  }

  return response.json();
}

export function isConflictError(error: unknown): boolean {
  if (!(error instanceof GitHubApiError)) {
    return false;
  }

  return error.status === 409 || error.status === 422;
}

export async function readDailyLogFile(): Promise<{ content: string; sha: string }> {
  const config = getConfig();
  const path = encodePath(config.targetPath);
  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/contents/${path}?ref=${encodeURIComponent(config.branch)}`;

  const data = (await fetchGitHubJson(url, { method: "GET" })) as GitHubContentResponse;
  const decoded = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");

  return {
    content: decoded,
    sha: data.sha
  };
}

export async function writeDailyLogFile(params: {
  content: string;
  sha: string;
  message: string;
}): Promise<{ commitSha: string; commitUrl: string }> {
  const config = getConfig();
  const path = encodePath(config.targetPath);
  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/contents/${path}`;

  const body = {
    message: params.message,
    content: Buffer.from(params.content, "utf8").toString("base64"),
    sha: params.sha,
    branch: config.branch
  };

  const data = (await fetchGitHubJson(url, {
    method: "PUT",
    body: JSON.stringify(body)
  })) as GitHubWriteResponse;

  const commitSha = data.commit?.sha;
  const commitUrl = data.commit?.html_url;

  if (!commitSha || !commitUrl) {
    throw new Error("GitHub response did not include commit details.");
  }

  return { commitSha, commitUrl };
}
