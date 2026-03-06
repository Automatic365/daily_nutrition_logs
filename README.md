# Combat Nutrition Log Updater v1

A password-protected Next.js app that lets you paste a full daily markdown entry, update `daily_log.md`, and commit directly to GitHub `main`.

## Features

- Password-protected UI for single-user write access
- Validates pasted entries start with `## YYYY-MM-DD — ...`
- Replaces existing date entry, or appends if date is new
- Commits to GitHub via Contents API
- Retries once on GitHub write conflict
- Structured submit response with commit SHA and URL

## Environment Variables

Copy `.env.example` to `.env.local` and set:

- `APP_PASSWORD`: login password for the UI
- `SESSION_SECRET`: long random secret for signing session tokens
- `GITHUB_TOKEN`: PAT with repo contents write access
- `GITHUB_OWNER`: repo owner (user or org)
- `GITHUB_REPO`: repo name
- `GITHUB_BRANCH`: defaults to `main`
- `GITHUB_TARGET_PATH`: must be `daily_log.md`

## Local Development

```bash
npm install
npm run dev
```

App URL: `http://localhost:3000`

## Test and Build

```bash
npm test
npm run build
```

## Deploy to Vercel (Free Tier)

1. Import this repo into Vercel.
2. Add all environment variables from `.env.example`.
3. Deploy.
4. Use the deployed URL to log in and submit entries.

## Security Notes

- GitHub PAT and app password remain server-side.
- Session cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
- Endpoint writes are restricted to `daily_log.md` only.

## Manual Smoke Checklist

1. Log in with `APP_PASSWORD`.
2. Paste a valid full entry block and submit.
3. Confirm response includes date, action, commit SHA/link, and timestamp.
4. Confirm commit appears on `main` and modifies only `daily_log.md`.
5. Confirm existing workflow `.github/workflows/trigger_dashboard.yml` runs after commit.
