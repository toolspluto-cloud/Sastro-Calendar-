# Satro Calendar (MVP)

Calendar + Guide chat with muhurat-aware day scores, Life Path Prep, and optional Google Calendar / Meet.

**Pluto Theory · Tuto · Build** — traditional/symbolic entertainment guidance, not predictive certainty.

## Quick start

```bash
cd /workspace/satro-calendar
cp env.template .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Google OAuth credentials the app runs fully in **mock mode** (sample events + simulated event creates that print the payload).

```bash
npm run build   # production build
npm start       # serve production build
```

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `NEXTAUTH_URL` | Yes for OAuth | e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Yes for OAuth | random string (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` | For real Calendar | Google Cloud OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For real Calendar | Google Cloud OAuth client secret |
| `SATRO_MOCK_CALENDAR` | Optional | `true` forces mock even if OAuth is set |
| `SATRO_LLM_API_KEY` | For AI chat | Anthropic API key. Leave empty for template replies |
| `SATRO_LLM_MODEL` | Optional | Claude model ID. Defaults to `claude-opus-5-5` |

See `env.template`.

## Google Cloud OAuth setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
4. Application type: **Web application**.
5. Authorized JavaScript origins: `http://localhost:3000`
6. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID + Client Secret into `.env.local`.
8. OAuth consent screen: add your Google account as a test user while in Testing.
9. Restart `npm run dev`, open Home → **Connect Google Calendar**.

**Scopes requested:**

- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.readonly`
- plus `openid email profile`

Satro-created events are tagged with `extendedProperties.private.satro=true`.

## What’s in the MVP

| Screen | Behavior |
|---|---|
| **Home** | Marketing + Google sign-in stub |
| **Today** | Scores work/meetings/rest/social from `data/daily-planning-rules.json` + weekday lords + synthetic tithi/karana/yoga + Rahu Kaal eighths (fixed 6am–6pm daylight) |
| **Calendar** | Day / Week / Month UI; Google events when connected, else mocks; Rahu Kaal caution banner |
| **Chat** | Daily tip + Q&A matched **only** from training JSON (no live ephemeris, no external LLM) |
| **Prep** | Two names + birth dates → Life Path compare → ≤5 tips → create event (+ optional Meet) or simulated payload |
| **Profile** | Birth date form (localStorage); photo delete-after-analysis note |

Training JSON lives in `/workspace/satro-calendar/data/` (copied from `/workspace/astrology-training-data/`).

## Mock vs real

| Feature | Without OAuth | With OAuth + sign-in |
|---|---|---|
| Today / Chat / Prep compare | Real (local rules) | Same |
| Calendar list | Mock events | Google Calendar events |
| Prep → create event | Simulated + shows payload | Writes to primary calendar; Meet if checked |

## Out of scope (Later)

Live Vimshottari / ephemeris, gemstone prescriptions, face or handwriting ML, Gmail sync.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · NextAuth (Google) · googleapis · date-fns
