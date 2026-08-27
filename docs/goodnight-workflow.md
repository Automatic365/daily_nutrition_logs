# Goodnight Conversation Logging Contract

## Trigger and review

When the user says **“goodnight”**, the conversation runtime should:

1. Read only facts the user stated in that day's conversation.
2. Build a `DailyRecordDraft` from those facts. Leave any missing or uncertain property as an empty string; do not estimate it.
3. Open the authenticated updater with that draft in the URL fragment (`#draft=...`). The fragment stays in the browser and is not sent in server request logs.
4. Let the user edit the compact checklist. Missing fields remain highlighted as unknown.
5. Do not submit, commit, push, or otherwise change GitHub until the user selects the explicit confirmation checkbox and presses **Confirm & commit**.

The updater re-checks confirmation and invalid values on the server. Missing values may be approved as genuinely unknown; invalid values cannot be submitted.

## Prefill handoff

The `draft` fragment value is URI-encoded JSON with this shape:

```json
{
  "entryDate": "2026-08-27",
  "status": "Pass",
  "weight": "160.0",
  "abdomenNavel": "31.50",
  "waistPlus2": "30.80",
  "waistMinus2": "31.90",
  "sleep": "7h 05m",
  "calories": "1650",
  "protein": "195",
  "fast": "false",
  "adherenceScore": "95",
  "bossMode": "none",
  "bossName": "",
  "bossOutcome": "none"
}
```

All properties are strings. `fast` is `"true"`, `"false"`, or `""`. The runtime may omit properties it does not know; the form merges only provided values into an empty draft.

## Canonical write

Confirmation sends the structured draft plus `confirmed: true` to `POST /api/logs/submit`. The server renders exactly one dated `### App Parse Block`, replaces that date if it already exists or appends it otherwise, then commits only `daily_log.md` through the GitHub Contents API.

That commit triggers `.github/workflows/trigger_dashboard.yml`, which dispatches the existing configured dashboard rebuild. There is no separate dashboard entry or secondary dashboard data source.

## Remaining runtime integration

The updater and repository do not have access to the host conversation transcript. The voice/conversation host must implement the trigger phrase detection, extraction from the current day's conversation, and navigation to the updater URL with the encoded `draft`. This is the only remaining integration boundary; record review, approval gating, canonical rendering, GitHub commit, and dashboard rebuild dispatch are handled here.
