# Combat Nutrition Log Updater v1

A password-protected Next.js app for reviewing a conversation-prefilled nightly record, then updating `daily_log.md` on GitHub `main` only after explicit confirmation.

## Features

- Password-protected UI for single-user write access
- Compact, editable checklist for the canonical App Parse Block fields
- Conversation prefill through the documented `draft` handoff
- Missing and uncertain values are highlighted and serialized as `unknown`, never invented
- Client confirmation checkbox plus server-side confirmation enforcement
- Replaces existing date entry, or appends if date is new
- Commits to GitHub via Contents API
- Retries once on GitHub write conflict
- Structured submit response with commit SHA and URL

## Data Flow

`daily_log.md` is the one canonical source for this workflow. Its existing GitHub workflow dispatches the dashboard rebuild automatically. The updater does not create or maintain a second dashboard data path.

See [`docs/goodnight-workflow.md`](docs/goodnight-workflow.md) for the conversation handoff and approval contract.

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

1. Log in with `APP_PASSWORD` and open a conversation-prefilled draft.
2. Correct the compact checklist and verify missing values are highlighted.
3. Verify no request writes until the confirmation checkbox is selected.
4. Confirm response includes date, action, commit SHA/link, and timestamp.
5. Confirm commit appears on `main` and modifies only `daily_log.md`.
6. Confirm existing workflow `.github/workflows/trigger_dashboard.yml` runs after commit.
