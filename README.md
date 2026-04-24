# Combat Nutrition Log Updater v1

A password-protected Next.js app that lets you paste a full daily markdown entry, update `daily_log.md`, and commit directly to GitHub `main`.

## Features

- Password-protected UI for single-user write access
- Date picker to choose which day the entry applies to
- Accepts entries with or without `## YYYY-MM-DD — ...` header
- Auto-prepends `## YYYY-MM-DD — Day` from selected date when missing
- Replaces existing date entry, or appends if date is new
- Commits to GitHub via Contents API
- Retries once on GitHub write conflict
- Structured submit response with commit SHA and URL

## Logging Sync Rule

All future manual log updates must be written to both files:

- `daily_log.md` (full narrative source of truth)
- `logs/app_parse_blocks_complete.md` (LLM-friendly parse-block ledger)

If a day is updated in one file, the same day must be updated in the other file in the same change.

## Environment Variables

Copy `.env.example` to `.env.local` and set:

- `APP_PASSWORD`: login password for the UI
- `SESSION_SECRET`: long random secret for signing session tokens
- `APP_TIMEZONE`: timezone used when auto-prepending today's header (defaults to `America/Chicago`)
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
2. Pick an entry date, paste an entry block (header optional), and submit.
3. Confirm response includes date, action, commit SHA/link, and timestamp.
4. Confirm commit appears on `main` and modifies only `daily_log.md`.
5. Confirm existing workflow `.github/workflows/trigger_dashboard.yml` runs after commit.
