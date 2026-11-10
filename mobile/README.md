# Health App (mobile)

Cross-platform (Expo SDK 58 / React Native) health program app. All data stays on the device.

**Built so far:** all four modules: physique scan, questionnaire, workout planner, and workout tracker. The scan needs the server in `../server` (see its README; `SCAN_MOCK=1` works without an API key). Planner rules live in `../docs/planner-rules.md`.

## Requirements
Node **22.13+** (Expo SDK 58 requirement). Check with `node -v`.

## Run
```bash
npm install
npx expo start          # press w for web, i for iOS simulator, or scan the QR with Expo Go
```

## Checks
```bash
npm run typecheck
npx eslint src
npm test
PRINT_PLANS=1 npx jest print   # print sample plans to review
```

## Layout
- `src/app/(tabs)/` — bottom tabs: Today (dashboard), Plan, Progress, Profile
- `src/app/` — stacked screens: `questionnaire/`, `scan/`, `plan/` (setup, day editor, swap, add, priorities), `track/` (weeks, session, exercise history)
- `src/features/dashboard/` — what to do today, top tips
- `src/features/profile/` — option lists, zod schemas, unit conversions, on-device storage, store
- `src/features/questionnaire/` — step registry, step screens, summary
- `src/features/planner/` — exercise library, rule tables, plan engine (`engine.ts`), edits, schedule, store
- `src/app/plan/` — setup, weekly overview, day editor, swap, add, adjust priorities
- `src/features/tracker/` — progression rules (`progression.ts`), sessions/weeks/check-in, store
- `src/app/track/` — weeks, session logging with check-in, progress, exercise history chart
- `src/features/scanner/` — photo prep + API client, result schema, scan store (results only, no photos)
- `src/app/scan/` — consent and photo capture, results
- `src/components/` — shared UI (navy-violet theme in `src/constants/theme.ts`)
