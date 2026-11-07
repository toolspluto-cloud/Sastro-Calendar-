# SATRO CALENDAR — BUILD SPEC FOR CLAUDE CODE

> **You are Claude Code.** This file is your full brief for building **Satro Calendar**: a mobile-first astro day calendar. Read all of it before you write code. If you were given `satro-starter.zip`, this file is its `CLAUDE.md` and the folder already holds a working MVP: **continue it, don't restart it** (see §15 "Built vs. to build"). If you only have this file, build from scratch by following the milestones in §16 in order.
>
> **Hard rules**
> 1. Never commit or print secrets. Keep all credentials in `.env.local`, which is git-ignored. Never hardcode a client ID, client secret, or token.
> 2. Every astrology or numerology output is **traditional/symbolic guidance for entertainment and education**. It is not a prediction and not medical, financial, or legal advice. The disclaimer must show on every screen (§13).
> 3. Show times in the viewer's local timezone. Never format an event time in UTC (§11).
> 4. When Google is not connected, use mock mode with sample events, and **say so in the UI** with a "Mock" badge. Never silently show fake data as if it were real.
> 5. Run `npm run build` and `npm run lint` after each milestone. Fix every error before you move on.

---

## 1. Product overview

**Satro** opens like a normal calendar. On top of that it adds astrology and numerology as **short keyword chips** placed on a day timeline (6:00 AM to midnight), instead of long paragraphs. Events such as gym, finance, doctor, and meetings get a **Lean in** or **Keep in mind** tip based on the chips they overlap. A small **chat guide** checks in with a morning "How today looks" card and an evening "How did it go?" card. The feedback it collects improves personalisation over time.

- **Brand:** Satro · a Pluto Theory × Tuto project. Owner: Arjun Reddy.
- **Design north star:** the calendar comes first. Astrology appears only as chips, never as walls of text. The visual order is time rail → events → chips → tips. Each screen has one primary action.

### Phase 1 — Data in (onboarding / profile)
| Field | Required | Notes |
|---|---|---|
| Display name | Yes | How the guide addresses the user |
| Birth date | Yes | Life Path, sun-sign (rashi) and day-lord baseline |
| Time of birth | Preferred | Optional. Show a soft disclaimer that timing is stronger with it |
| Place of birth | Preferred | City text. Later used for sunrise/sunset and Rahu Kaal |
| Current city / timezone | Preferred | Default to the browser timezone. Drives the daily Rahu Kaal window |
| Life domains | Optional | **Multi-select** from 10 domains, in order. Default `["career"]` |
| Notification cadence | Optional | `off` or `daily` (one daily best-hour nudge) |
| Calendars to sync | Optional | Picked after Google connect (§10) |

### Phase 2 — Clean day calendar
- Timeline window **06:00 → 24:00**.
- **10 life domains:** `career` (first by default), `money`, `health`, `social`, `romance`, `focus`, `travel`, `family`, `creativity`, `rest`.
- Each domain gets a 0–10 score with a label (`avoid` / `neutral` / `favored`) and chips drawn from a **30-chip library** in four tones: `mood`, `energy`, `opportunity`, `caution`.
- Chips follow weekday lord, synthetic panchang (tithi/karana/yoga), Rahu Kaal, the user's Life Path / Personal Day, and their rashi lord.
- Events can be added in Satro (and pushed to Google) or imported from Google. One or more calendars can be selected.
- Tapping an event opens a **bottom-sheet tip**: Lean in / Keep in mind / Steady.

### Chat assistant
- Morning card: **How today looks** (weekday lord, top domains, 3–5 chips, Rahu Kaal window, "Open Day" CTA).
- After events end: **How did it go?** (thumbs up/down plus tags `on track`, `draining`, `good timing`, `off vibe`, optional note).
- Light Q&A answered only from the local training JSON. The optional LLM mode must stay grounded in that JSON (§12).
- This is **not** a messaging-app clone. It uses structured cards plus one input.

### Out of scope (Later)
Live ephemeris or a full Vimshottari chart, gemstone prescriptions, face or handwriting reading, palm ML, Gmail or Contacts sync, writing muhurat blocks into Google, and more than one push notification a day.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 15.5 (App Router)** + React 19 + TypeScript 5 (strict). Moved off 14.2, which has no security patches |
| Styling | Tailwind CSS 3.4 + small component classes in `globals.css` |
| Auth | **NextAuth v4** with the Google provider, JWT sessions |
| Google | `googleapis` (Calendar v3) |
| Dates | `date-fns` v4 plus native `Intl` |
| Font | Geist (local woff, `next/font/local`) |
| Persistence (MVP) | JSON files under `data/` (single user, local only). Milestone 9 moves this to SQLite/Prisma or Vercel Postgres for multi-user |
| Tests | Vitest for `lib/*` unit tests; Playwright for smoke tests (optional) |
| Optional LLM | Claude via `@anthropic-ai/sdk` behind `SATRO_LLM_*` env vars, off by default |

### Exact setup commands (from scratch)
```bash
npx create-next-app@14 satro-calendar --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd satro-calendar
npm install next-auth@^4.24 googleapis date-fns@^4
npm install -D vitest @vitest/coverage-v8
cp env.template .env.local          # then fill values (see §3)
openssl rand -base64 32             # paste as NEXTAUTH_SECRET
npm run dev                         # http://localhost:3000
```
Continue from the starter zip instead:
```bash
unzip satro-starter.zip -d satro-calendar && cd satro-calendar
npm install
cp env.template .env.local && $EDITOR .env.local
npm run dev
```
Add these scripts to `package.json`: `"test": "vitest run"` and `"typecheck": "tsc --noEmit"`.

---

## 3. Environment variables (names only — never commit values)

| Name | Required | Purpose |
|---|---|---|
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` locally; the production origin when deployed |
| `NEXTAUTH_SECRET` | Yes | Random 32+ byte string (`openssl rand -base64 32`). **No hardcoded fallback in code.** In production, throw if it is missing |
| `GOOGLE_CLIENT_ID` | For live Calendar | Google OAuth Web client ID |
| `GOOGLE_CLIENT_SECRET` | For live Calendar | Google OAuth Web client secret |
| `SATRO_MOCK_CALENDAR` | Optional | `true` forces mock mode even when OAuth is set |
| `SATRO_LLM_API_KEY` | Optional | Enables LLM phrasing in chat (§12). Leave empty for rule-only mode |
| `SATRO_LLM_MODEL` | Optional | Claude model ID. Defaults to `claude-opus-5-5` |
| `DATABASE_URL` | Milestone 9 | When moving off JSON files |

`env.template` (ship this file. It contains no values):
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SATRO_MOCK_CALENDAR=false
SATRO_LLM_API_KEY=
SATRO_LLM_MODEL=
```

### Getting a Google OAuth client (Google Cloud Console)
1. Go to https://console.cloud.google.com/ and create or select a project (for example "Satro").
2. **APIs & Services → Library**: enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**: choose External, set the app name "Satro Calendar" and a support email, and add these scopes:
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/calendar.events` (read and write events)
   - `https://www.googleapis.com/auth/calendar.readonly` (list the user's calendars for the picker, plus free/busy)
   While the app is in **Testing**, add your Google account under **Test users**.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**, with type **Web application**.
   - Authorized JavaScript origins: `http://localhost:3000` (plus the production origin, for example `https://satro.example.com`)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` (plus `https://<prod-domain>/api/auth/callback/google`)
5. Copy the Client ID and Client Secret into `.env.local`. Restart `npm run dev`.
6. Note: Google returns a `refresh_token` only on first consent. The app must request `access_type=offline` and `prompt=consent`. If a test user consented earlier without offline access, remove access at https://myaccount.google.com/permissions and sign in again.

---

## 4. Folder structure (target)

```
satro-calendar/
├─ CLAUDE.md                      # this spec
├─ env.template
├─ package.json  tsconfig.json  tailwind.config.ts  postcss.config.mjs  next.config.mjs  .eslintrc.json  .gitignore
├─ data/
│  ├─ timeline-keywords.json      # 30-chip library (§6) — committed
│  ├─ daily-planning-rules.json   # scoring rubric — committed (training data)
│  ├─ panchang.json numerology.json rashis.json grahas.json nakshatras.json bhavas.json
│  ├─ meeting-prep-rules.json palmistry.json photo-handling-rules.json
│  ├─ user-profile.json           # RUNTIME, git-ignored (personal data)
│  ├─ local-events.json           # RUNTIME, git-ignored (personal events)
│  ├─ feedback.json               # RUNTIME, git-ignored
│  └─ calendar-prefs.json         # RUNTIME, git-ignored (selected calendar ids)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx               # Nav + DisclaimerBanner + BottomNav + Providers
│  │  ├─ globals.css              # tokens + .satro-* component classes
│  │  ├─ page.tsx                 # Home: hero, Google connect, funnel CTA
│  │  ├─ onboarding/page.tsx      # (to build) stepper wrapper around profile fields
│  │  ├─ profile/page.tsx         # Profile form (+ domains multi-select, calendars)
│  │  ├─ calendar/page.tsx        # Day (default) / Week / Month — PRIMARY HOME
│  │  ├─ chat/page.tsx            # Today card, How-did-it-go, Q&A
│  │  ├─ prep/page.tsx            # Prep lite (Life Path compare → book)
│  │  └─ api/
│  │     ├─ auth/[...nextauth]/route.ts
│  │     ├─ config/route.ts
│  │     ├─ profile/route.ts
│  │     ├─ timeline/route.ts
│  │     ├─ scores/route.ts
│  │     ├─ calendar/events/route.ts
│  │     ├─ calendar/list/route.ts       # (to build)
│  │     ├─ calendar/prefs/route.ts      # (to build)
│  │     ├─ chat/route.ts
│  │     ├─ feedback/route.ts
│  │     └─ prep/route.ts
│  ├─ components/
│  │  ├─ Nav.tsx                  # Nav (desktop top), BottomNav (mobile), DisclaimerBanner
│  │  ├─ Providers.tsx            # SessionProvider
│  │  ├─ HomeAuth.tsx HomeFunnel.tsx
│  │  ├─ KeywordChip.tsx ScoreRing.tsx
│  │  ├─ DomainPill.tsx           # (to extract)
│  │  ├─ DomainMultiSelect.tsx    # (to build)
│  │  ├─ CalendarPicker.tsx       # (to build)
│  │  └─ calendar/ DayTimeline.tsx EventTipSheet.tsx AddEventForm.tsx
│  ├─ lib/
│  │  ├─ auth.ts                  # NextAuth options + token refresh
│  │  ├─ google.ts                # list/create events, list calendars, mock fallback
│  │  ├─ datetime.ts              # local-TZ helpers (§11)
│  │  ├─ timeline.ts              # domain scores, chips, event tips, today card
│  │  ├─ scoring.ts               # weekday/tithi/karana/yoga/Rahu → channel scores
│  │  ├─ numerology.ts            # Life Path, name numbers, personal year/month/day
│  │  ├─ zodiac.ts                # (to build) sidereal sun-sign from birth date
│  │  ├─ prep.ts chat.ts profile.ts data.ts store.ts(to build)
│  └─ types/next-auth.d.ts
└─ tests/ (vitest)  timeline.test.ts datetime.test.ts numerology.test.ts auth-refresh.test.ts
```
`.gitignore` must include: `.env*` (but allow `env.template`), `/node_modules`, `/.next`, `/.next-dev` (dev builds use their own folder so `next build` can't corrupt a running dev server), `data/user-profile.json`, `data/local-events.json`, `data/feedback.json`, `data/calendar-prefs.json`, `*.tsbuildinfo`.

---

## 5. Data models (TypeScript)

Put the shared types in `src/lib/types.ts`, or keep them co-located as they are now. These are the canonical shapes:

```ts
// profile.ts
export const ALL_DOMAINS = ["career","money","health","social","romance","focus","travel","family","creativity","rest"] as const;
export type Domain = (typeof ALL_DOMAINS)[number];
export type UserProfile = {
  displayName: string;          // required
  birthDate: string;            // YYYY-MM-DD, required
  birthTime: string;            // HH:mm or ""
  birthPlace: string;           // free text or ""
  currentTimeZone?: string;     // IANA, e.g. "Asia/Kolkata"; default browser TZ
  preferredDomains: Domain[];   // ordered, min 1, default ["career"]
  notificationCadence?: "off" | "daily";
  selectedCalendarIds?: string[]; // default ["primary"]
};
export const PROFILE_STORAGE_KEY = "satro.profile"; // localStorage mirror
export function isProfileComplete(p): boolean // displayName && birthDate

// timeline.ts
export type KeywordTone = "mood" | "energy" | "opportunity" | "caution";
export type TimelineKeyword = { id: string; label: string; domain: Domain; tone: KeywordTone; tags: string[] };
export type KeywordLibrary = { schema: string; description: string; disclaimer: string; domains: Domain[]; tones: KeywordTone[]; keywords: TimelineKeyword[] };
export type TimedChip = { id: string; keywordId: string; label: string; domain: string; tone: KeywordTone; startHour: number; endHour: number; tags: string[] };
export type DomainScore = { domain: string; score: number; label: "avoid" | "neutral" | "favored" };
export type DayTimeline = {
  date: string; weekday: string; weekdayLord: string;
  window: { startHour: 6; endHour: 24 };
  chips: TimedChip[];             // ≤ 12, sorted by startHour
  domainScores: DomainScore[];    // all 10, preferred first
  topDomains: DomainScore[];      // first 4
  rahuKaal: { startHour: number; endHour: number; label: string };
  flags: string[];
  numerology?: { lifePath: number; personalYear: number; personalDay: number }; // (to build)
  rashi?: { name: string; lord: string; element: string };                       // (to build)
  disclaimer: string;
};
export type EventType = "gym" | "meeting" | "finance" | "doctor" | "other";
export type TipPattern = "lean-in" | "keep-in-mind" | "neutral";
export type EventTip = {
  leanIn: boolean; pattern: TipPattern;
  headline: "Time favors you" | "Buffer this slot" | "Steady window";
  leanInTips: string[]; keepInMind: string[];   // ≤ 3 / ≤ 4 short phrases
  overlappingChips: TimedChip[];                // ≤ 5
  domain: string;
};

// google.ts
export type CalEvent = {
  id: string; summary: string;
  start: string; end: string;     // RFC3339 with offset, floating local "YYYY-MM-DDTHH:mm:ss", or all-day "YYYY-MM-DD"
  htmlLink?: string; hangoutLink?: string;
  satro?: boolean;                // extendedProperties.private.satro === "true"
  type?: EventType;               // from extendedProperties.private.satroType or keyword inference
  calendarId?: string; calendarName?: string; calendarColor?: string;
  source: "google" | "mock";
};
export type GoogleCalendarInfo = { id: string; summary: string; primary: boolean; backgroundColor?: string; accessRole: string };

// feedback
export type FeedbackTag = "on track" | "draining" | "good timing" | "off vibe";
export type FeedbackEntry = { id: string; eventId: string; eventSummary: string; date: string; rating: "up" | "down"; tags: FeedbackTag[]; note?: string; createdAt: string };

// scoring.ts
export type Channel = "work" | "meetings" | "rest" | "socializing";
export type DayScores = {
  date: string; weekday: string; weekdayLord: string;
  synthetic: { tithiClass: string; tithiName: string; karana: string; yoga: string; paksha: "Shukla" | "Krishna" };
  channels: Record<Channel, number>; labels: Record<Channel, "avoid"|"neutral"|"favored">;
  rahuKaal: { startHour: number; endHour: number; label: string };
  flags: string[]; bestHourHint: string; disclaimer: string;
};

// next-auth.d.ts
declare module "next-auth" { interface Session { accessToken?: string; error?: "RefreshAccessTokenError" } }
declare module "next-auth/jwt" { interface JWT { accessToken?: string; refreshToken?: string; accessTokenExpires?: number; error?: "RefreshAccessTokenError" } }
```

Event-type inference, used when `type` is missing: match the summary case-insensitively. `gym|workout|run|yoga` → gym; `finance|budget|invoice|bank|tax|investor` → finance; `doctor|dentist|clinic|hospital|checkup` → doctor; `lunch|dinner|break` → other; everything else → meeting.

---

## 6. Keyword library

`data/timeline-keywords.json` is the source of truth; its labels were later rewritten in Satro's friendly voice (§14.1). The block below shows the structure.

```json
{
  "schema": "timeline-keywords.v2",
  "description": "Reusable keyword chips for Satro Calendar day timeline. Domains map to life areas; tone drives chip styling and event overlay tips.",
  "disclaimer": "Traditional/symbolic entertainment guidance. Not predictive certainty or medical/financial advice.",
  "domains": [
    "career",
    "money",
    "health",
    "social",
    "romance",
    "focus",
    "travel",
    "family",
    "creativity",
    "rest"
  ],
  "tones": ["mood", "energy", "opportunity", "caution"],
  "keywords": [
    {
      "id": "career-lift",
      "label": "Career lift",
      "domain": "career",
      "tone": "opportunity",
      "tags": ["work", "pitch", "visibility"]
    },
    {
      "id": "steady-grind",
      "label": "Steady grind",
      "domain": "career",
      "tone": "energy",
      "tags": ["deep-work", "admin"]
    },
    {
      "id": "hold-the-pitch",
      "label": "Hold the pitch",
      "domain": "career",
      "tone": "caution",
      "tags": ["rahu-kaal", "new-starts"]
    },
    {
      "id": "clear-headed",
      "label": "Clear-headed",
      "domain": "focus",
      "tone": "mood",
      "tags": ["decisions", "planning"]
    },
    {
      "id": "scattered-mind",
      "label": "Scattered mind",
      "domain": "focus",
      "tone": "caution",
      "tags": ["multitask", "distract"]
    },
    {
      "id": "deep-focus",
      "label": "Deep focus",
      "domain": "focus",
      "tone": "energy",
      "tags": ["flow", "solo-work"]
    },
    {
      "id": "money-window",
      "label": "Money window",
      "domain": "money",
      "tone": "opportunity",
      "tags": ["negotiate", "invoice", "deal"]
    },
    {
      "id": "spend-careful",
      "label": "Spend careful",
      "domain": "money",
      "tone": "caution",
      "tags": ["impulse", "contracts"]
    },
    {
      "id": "steady-cash",
      "label": "Steady cash",
      "domain": "money",
      "tone": "mood",
      "tags": ["budget", "track"]
    },
    {
      "id": "body-ready",
      "label": "Body ready",
      "domain": "health",
      "tone": "energy",
      "tags": ["gym", "workout", "vitality"]
    },
    {
      "id": "pace-yourself",
      "label": "Pace yourself",
      "domain": "health",
      "tone": "caution",
      "tags": ["fatigue", "recovery"]
    },
    {
      "id": "vital-up",
      "label": "Vital up",
      "domain": "health",
      "tone": "mood",
      "tags": ["wellness", "movement"]
    },
    {
      "id": "social-open",
      "label": "Social open",
      "domain": "social",
      "tone": "opportunity",
      "tags": ["network", "meetup"]
    },
    {
      "id": "keep-light",
      "label": "Keep it light",
      "domain": "social",
      "tone": "caution",
      "tags": ["conflict", "gossip"]
    },
    {
      "id": "warm-vibe",
      "label": "Warm vibe",
      "domain": "social",
      "tone": "mood",
      "tags": ["friends", "team"]
    },
    {
      "id": "heart-open",
      "label": "Heart open",
      "domain": "romance",
      "tone": "opportunity",
      "tags": ["date", "connection"]
    },
    {
      "id": "soft-edges",
      "label": "Soft edges",
      "domain": "romance",
      "tone": "caution",
      "tags": ["misread", "pressure"]
    },
    {
      "id": "tender-mood",
      "label": "Tender mood",
      "domain": "romance",
      "tone": "mood",
      "tags": ["affection", "listen"]
    },
    {
      "id": "road-favor",
      "label": "Road favors",
      "domain": "travel",
      "tone": "opportunity",
      "tags": ["commute", "trip"]
    },
    {
      "id": "delay-prone",
      "label": "Delay-prone",
      "domain": "travel",
      "tone": "caution",
      "tags": ["traffic", "buffer"]
    },
    {
      "id": "home-anchor",
      "label": "Home anchor",
      "domain": "family",
      "tone": "mood",
      "tags": ["home", "care"]
    },
    {
      "id": "family-sync",
      "label": "Family sync",
      "domain": "family",
      "tone": "opportunity",
      "tags": ["talk", "support"]
    },
    {
      "id": "guard-boundaries",
      "label": "Guard boundaries",
      "domain": "family",
      "tone": "caution",
      "tags": ["tension", "space"]
    },
    {
      "id": "idea-spark",
      "label": "Idea spark",
      "domain": "creativity",
      "tone": "opportunity",
      "tags": ["brainstorm", "make"]
    },
    {
      "id": "creative-flow",
      "label": "Creative flow",
      "domain": "creativity",
      "tone": "energy",
      "tags": ["design", "write"]
    },
    {
      "id": "edit-not-ship",
      "label": "Edit, don't ship",
      "domain": "creativity",
      "tone": "caution",
      "tags": ["draft", "refine"]
    },
    {
      "id": "restore-now",
      "label": "Restore now",
      "domain": "rest",
      "tone": "opportunity",
      "tags": ["nap", "wind-down"]
    },
    {
      "id": "low-battery",
      "label": "Low battery",
      "domain": "rest",
      "tone": "energy",
      "tags": ["sleep", "recover"]
    },
    {
      "id": "protect-quiet",
      "label": "Protect quiet",
      "domain": "rest",
      "tone": "caution",
      "tags": ["overbook", "noise"]
    },
    {
      "id": "speak-up",
      "label": "Speak up",
      "domain": "career",
      "tone": "mood",
      "tags": ["meetings", "advocacy"]
    }
  ]
}
```

Chip styling by tone: mood = violet, energy = sky, opportunity = emerald, caution = amber (§9 tokens). Labels stay short (≤ 18 chars). Never invent chips at runtime; extend only this file.

---

## 7. Astrology & numerology calculation rules

The engine is deterministic and fully local, with **no live ephemeris**. The panchang values are *synthetic stand-ins* derived from the date. Label them that way in the UI ("approx.") and in code comments. The source tables are the JSON files in `data/`. Below is the minimum you need.

### 7.1 Weekday lord (vara)
Sun→**Sun**, Mon→**Moon**, Tue→**Mars**, Wed→**Mercury**, Thu→**Jupiter**, Fri→**Venus**, Sat→**Saturn**.
Each lord's area of favour: Sun covers authority and vitality. Moon covers emotions, public life, nurture and short travel. Mars covers courage and competition (caution for soft starts). Mercury covers commerce, writing, study and deals. Jupiter covers teaching, finance and expansion. Venus covers arts, relationships and diplomacy. Saturn covers discipline and service (avoid starting finance work).

### 7.2 Synthetic panchang (MVP, from `lib/scoring.ts`)
- `dayOfYear` = day index of the local date (1–366).
- `tithiNum = ((dayOfYear-1) % 30) + 1`. Paksha is `Shukla` for 1–15 and `Krishna` for 16–30. `lunarDay = ((tithiNum-1)%15)+1`.
- Tithi class by lunarDay is a repeating cycle: 1,6,11 = **Nanda** · 2,7,12 = **Bhadra** · 3,8,13 = **Jaya** · 4,9,14 = **Rikta** · 5,10 = **Purna** · tithiNum 15 = **Purnima** · tithiNum 30 = **Amavasya**.
- Karana = `["Bava","Balava","Kaulava","Taitila","Gara","Vanija","Vishti"][dayOfYear % 7]`.
- Yoga = `["Siddhi","Shiva","Siddha","Sadhya","Shubha","Brahma","Indra","Saubhagya","Ayushman","Atiganda","Shula","Ganda","Vyaghata","Vyatipata","Parigha","Vaidhriti","Priti","Harshana"][dayOfYear % 18]`.

### 7.3 Channel scoring rubric (`daily-planning-rules.json`)
Channels are `work`, `meetings`, `rest` and `socializing`. Each one starts at **5**, then:
1. **Weekday affinity** (add):

| channel | Sun | Moon | Mars | Mercury | Jupiter | Venus | Saturn |
|---|---|---|---|---|---|---|---|
| work | 1 | 0 | 1 | 2 | 2 | 1 | 1 |
| meetings | 1 | 1 | 0 | 2 | 2 | 2 | 0 |
| rest | 0 | 2 | -1 | 0 | 1 | 1 | 2 |
| socializing | 1 | 2 | 1 | 1 | 1 | 2 | -1 |

2. **Tithi modifier**, as work/meetings/rest/social: Nanda 1/1/0/1 · Bhadra 1/1/0/0 · Jaya 1/2/-1/1 · Rikta -2/-2/1/-1 · Purna 1/1/0/2 · Amavasya -2/-2/2/-1 · Purnima 0/1/0/2.
3. **Karana**: Vishti -3/-3/+1/-2 · Vanija +2/+2/0/+1 · other karanas 0.
4. **Yoga**: inauspicious (Atiganda, Shula, Ganda, Vyaghata, Vyatipata, Parigha, Vaidhriti) -2/-2/+1/-1. Highly auspicious (Siddhi, Shiva, Siddha, Sadhya, Shubha, Brahma, Indra, Saubhagya, Ayushman) +1/+1/0/+1.
5. **Moon phase**: Shukla gives +1 to work and meetings. Krishna gives +1 to rest.
6. **Personal overlays** (to build):
   - If the weekday lord equals the user's rashi lord (§7.6), add +1 to all channels ("Personal affinity day").
   - If Personal Year is 4 or 8: work -1, rest +1, social -1, and set the flag `stress_year`.
7. Clamp to 0–10 and label it: **0–3 avoid**, **4–6 neutral**, **7–10 favored**.

Flags:
- Rikta or Amavasya: "prefer admin, cleanup, rest over launches".
- Vishti: "avoid new auspicious starts".
- Inauspicious yoga: "keep agenda short and concrete".
- Rahu Kaal label.
- `bestHourHint` = the best channel plus ~10:00, moved to after Rahu Kaal if they overlap.

### 7.4 Rahu Kaal
Split sunrise→sunset into **8 equal parts**. The weekday picks the part: Mon 2 · Tue 7 · Wed 5 · Thu 6 · Fri 4 · Sat 3 · Sun 8.
- MVP uses a fixed 06:00–18:00 daylight, which gives: Mon 07:30–09:00, Tue 15:00–16:30, Wed 12:00–13:30, Thu 13:30–15:00, Fri 10:30–12:00, Sat 09:00–10:30, Sun 16:30–18:00. Label it "approx., fixed daylight".
- Later: compute local sunrise/sunset from the user's current city (lat/lon with a NOAA formula or the `suncalc` package). Never hardcode clock ranges once that exists.
- Hour rule: any hour inside Rahu Kaal gives work -4, meetings -4, rest +1, social -2, with flag `avoid_new_starts`. Work that has already started may continue.
- Yamaganda and Gulika are optional extra caution eighths (-2/-2/0/-1).

### 7.5 Channel → 10 domains
Map with `work → career, focus, creativity` · `meetings → career, social, romance` · `rest → rest, health, family` · `socializing → social, romance, family, travel`.
- A domain's score is the average of its channel scores. Domains with no channel (money, travel when unmapped) start at 5.
  - To build: money = avg(work, meetings) adjusted by weekday (Jupiter/Mercury/Venus +1, Saturn -1).
- Preferred domains get **+0.4**, capped at 10.
- Sort preferred domains first, in the user's order, then by score descending. Round to 0.1.

### 7.6 Zodiac (rashi) from birth date (to build: `lib/zodiac.ts`)
Use the **sidereal** sun-sign by date as an approximation (no ephemeris). Return `{ num, sanskrit, english, lord, element, quality }`:

| Dates | Rashi | Lord | Element | Quality |
|---|---|---|---|---|
| Apr 14–May 14 | Mesha (Aries) | Mars | Fire | Movable |
| May 15–Jun 14 | Vrishabha (Taurus) | Venus | Earth | Fixed |
| Jun 15–Jul 15 | Mithuna (Gemini) | Mercury | Air | Dual |
| Jul 16–Aug 16 | Karka (Cancer) | Moon | Water | Movable |
| Aug 17–Sep 16 | Simha (Leo) | Sun | Fire | Fixed |
| Sep 17–Oct 16 | Kanya (Virgo) | Mercury | Earth | Dual |
| Oct 17–Nov 15 | Tula (Libra) | Venus | Air | Movable |
| Nov 16–Dec 15 | Vrishchika (Scorpio) | Mars | Water | Fixed |
| Dec 16–Jan 13 | Dhanu (Sagittarius) | Jupiter | Fire | Dual |
| Jan 14–Feb 12 | Makara (Capricorn) | Saturn | Earth | Movable |
| Feb 13–Mar 13 | Kumbha (Aquarius) | Saturn | Air | Fixed |
| Mar 14–Apr 13 | Meena (Pisces) | Jupiter | Water | Dual |

Use it for the personal-affinity overlay (§7.3 step 6) and for Prep element/quality tips. Show it as "Sun sign (sidereal, approx.)". A birth time does **not** change it in the MVP.

### 7.7 Numerology (`lib/numerology.ts`, `numerology.json`)
- **Life Path** (Pythagorean): reduce the month, the day, and the year's digit-sum separately, keeping masters 11, 22 and 33. Add the three and reduce again, keeping masters.
  - Example: 14 Mar 1991 → 3 + 5 + (1+9+9+1=20→2) = 10 → **1**.
- **Expression / name number**: map letters with Pythagorean A=1…I=9 repeating (J=1…R=9, S=1…Z=8). Chaldean is optional (A1 B2 C3 D4 E5 F8 G3 H5 I1 J1 K2 L3 M4 N5 O7 P8 Q1 R2 S3 T4 U6 V6 W6 X5 Y1 Z7). Sum and reduce, keeping masters.
- **Personal Year** = reduce(month) + reduce(day) + reduce(calendar year) → 1–9. Use the calendar-year convention and document it in the UI tooltip.
- **Personal Month** = PY + calendar month → 1–9.
- **Personal Day** = PM + calendar day → 1–9.
- **Personal Day → domain nudge** (Satro house rule, +0.5 to the domain score): 1 career · 2 social+romance · 3 creativity · 4 focus · 5 travel · 6 family · 7 rest+focus · 8 money+career · 9 social+family.
- Life Path themes, with lucky and unlucky numbers:

| LP | Theme | Lucky | Unlucky |
|---|---|---|---|
| 1 | Leadership, beginnings | 1,5,7 | 4,8 |
| 2 | Partnership, diplomacy | 2,4,6 | 5,9 |
| 3 | Creativity, expression | 3,5,9 | 4,8 |
| 4 | Stability, work | 1,4,7,8 | 5,9 |
| 5 | Freedom, change | 1,5,7 | 4,6 |
| 6 | Care, responsibility | 2,3,6,9 | 1,5 |
| 7 | Analysis, spirituality | 1,5,7 | 2,8 |
| 8 | Power, material results | 2,4,6,8 | 3,5 |
| 9 | Humanitarianism, completion | 3,6,9 | 4,7 |
| 11/22/33 | Master intuition / builder / teacher | 2,11 / 4,22 / 6,33 | 4,8 / 5,9 / 1,5 |

### 7.8 Chip placement on the day (`buildDayTimeline`)
Use six soft bands, each with a domain bias:

| Band | Bias |
|---|---|
| 6–9 | health, rest, focus |
| 9–12 | career, focus, money |
| 12–15 | social, money, career |
| 15–18 | creativity, career, travel |
| 18–21 | social, romance, family |
| 21–24 | rest, family, health |

For each band:
1. Order the domains: preferred first, then the band bias, then by score.
2. Place **up to 2 chips**. Pick each chip's tone in this order:
   - band midpoint inside Rahu Kaal → `caution`
   - domain `favored` → `opportunity`
   - domain `avoid` → `caution`
   - band ≥ 21 → `energy`
   - band < 9 → `mood`
   - otherwise any tone
3. Choose the first unused keyword for that domain and tone, falling back to any tone for the domain. **A keyword appears at most once per day.**
4. A chip spans the whole band, except a caution chip in Rahu Kaal, which is clamped to the Rahu window.
5. If the band overlaps Rahu Kaal, always add an extra caution chip for preferred domain #1 (tag it `rahu-kaal`).

Sort by start time and cap at **12** chips.

### 7.9 Event tip (`tipForEvent`)
1. Get the domain from the event type: gym → health, meeting → career, finance → money, doctor → health, other → focus.
2. Find the overlapping chips: `chip.start < event.end && chip.end > event.start`. Prefer chips in the event's domain; otherwise use all overlapping chips.
3. **Lean in** if: there are no caution chips **and** (there is an opportunity or energy chip **or** the domain is `favored`) **and** the event does not start in Rahu Kaal.
   - Headline "Time favors you".
   - `leanInTips` = up to 3 opportunity/energy labels. If there are none, use "Speak up" and "Close the ask while the window is open".
4. **Keep in mind** if there is a caution chip, or the event starts in Rahu Kaal.
   - Headline "Buffer this slot".
   - `keepInMind` = caution labels plus up to 2 mood labels, max 4. If there are none, use "Shorten if you can" and "Confirm numbers twice".
5. Otherwise **Neutral**: "Steady window", with the default "Steady pace — no alarm needed".

Canonical examples:
- Gym + Body ready → lean in.
- Finance + Hold the pitch / Spend careful → keep in mind.
- Doctor + Pace yourself → keep in mind.
- Lunch with no strong overlap → steady.

### 7.10 Prep lite (`lib/prep.ts`, `meeting-prep-rules.json`)
Compare two people (name plus birth date) → Life Paths and expression numbers.
- If both have the same Life Path, add "Open with shared values…".
- Add the counterpart Life Path rule. Masters reduce: 11→2, 22→4, 33→6.
  - LP1 respect their lead
  - LP2/6 partnership language
  - LP3 vivid/creative framing
  - LP4 structure and logistics
  - LP5 lively and flexible
  - LP7 depth and data, allow silence
  - LP8 ROI, timelines, risk controls
  - LP9 larger purpose
- Add generic rules: compatible elements, Fixed quality, weekday affinity overlap.
- Cap at **5 tips** and append the disclaimer.
- Then pick a free slot (use free/busy and avoid Rahu Kaal) → create the Google event, with an optional Meet.

### 7.11 Remedy attachment (optional, Chat only)
Attach at most one mantra, one colour tip and the fasting day, chosen by weekday lord. For example, Mercury: "Om Budhaya Namaha", green, Wednesday. **Always** show the gemstone caveat ("only after professional advice"). **Never** prescribe gems.

---

## 8. Screens

The layout shell (`app/layout.tsx`) is: sticky top `Nav` (desktop shows tabs; mobile shows only the logo and a "Home" link) → `DisclaimerBanner` → `<main class="mx-auto max-w-5xl px-3 py-4 pb-24 sm:px-4 sm:py-6 md:pb-6">` → `BottomNav` (mobile only, `md:hidden`, fixed bottom, honours `env(safe-area-inset-bottom)`).
- Tabs: **Day** `/calendar` · **Chat** `/chat` · **Prep** `/prep` · **Profile** `/profile`. Legacy "Scores" `/today` is a faint desktop-only link until it is retired.
- Flow: **Home → (Connect Google) → Profile/Onboarding → Day**. When the profile is complete, the Home CTA reads "Open your day" and goes to `/calendar`; otherwise it reads "Start with profile".

### 8.1 Home `/`
- Hero card: cosmic gradient (`from-cosmic to-cosmic-deep`), a solar blur orb, and the eyebrow "Pluto Theory · Tuto · Build".
- H1 "Your astro day calendar." with a one-line subtitle.
- CTAs: `HomeFunnel` (primary) and `HomeAuth` (Connect Google / Signed in as … / Sign out).
- Status line: "Google OAuth ready" vs "OAuth optional — mock events".
- Three step cards: 1 Profile, 2 Day timeline, 3 Guide chat.
- States: Google not configured → no connect button, show the mock note · signed in → email plus a **Live** badge · `session.error === "RefreshAccessTokenError"` → solar banner "Google session expired — reconnect".

### 8.2 Onboarding / Profile `/profile` (and `/onboarding` stepper)
- Fields: display name*, birth date*, birth time (with the soft note "Optional — timing is stronger with it"), birth place, current timezone (select, default browser TZ), **Life domains multi-select** (to build), notification cadence, and **Calendars to sync** (to build, shown only when Google is connected).
- `DomainMultiSelect`:
  - Ten toggle pills in `ALL_DOMAINS` order, using the `satro-domain-pill` style. Selected pills get `bg-cosmic text-white`.
  - Selection order is the priority order; show a small index badge (1, 2, 3…).
  - At least one must be selected (default career). Show at most 5 as "first-class", but allow all 10.
  - Keyboard: Space/Enter toggles. Each pill has `aria-pressed`.
- Save does three things: POST `/api/profile`, mirror to `localStorage["satro.profile"]`, then redirect to `/calendar`.
- States: loading skeleton · validation error (inline, red-free: use solar text) · saved toast.
- The onboarding stepper (to build) runs 1 Name → 2 Birth → 3 Domains → 4 Connect Google + pick calendars → 5 Done. Each step has one primary button.
- The privacy note must say: "photos (if ever used) are deleted after analysis".

### 8.3 Day `/calendar` (primary home)
- **Header:** a date switcher (‹ Today ›), a view toggle (Day · Week · Month, Day by default), and a sync badge (`Live` emerald vs `Mock` amber, with the reason in a tooltip).
- **Domain pills row:** wraps and never clips. Career comes first, followed by the preferred domains. Each pill shows the name plus `score/10` and a dot (favored emerald, neutral slate, avoid amber).
- **Caution banner** (one line): "Rahu Kaal ~1:30 PM–3:00 PM (approx.)", with solar used only on the mark.
- **DayTimeline:**
  - Hour rail 6a→11p, `ROW = 52px` per hour, with a half-hour tick.
  - Rahu band shaded `from-solar/[0.07] to-solar/[0.04]`, with a "RAHU" micro-label.
  - The chip column takes the left ~55% and the event column the right ~45%. Chips are grouped by start hour and wrap.
  - Event blocks: Satro events use `border-cosmic/35 bg-cosmic/12 text-cosmic`; Google events use a white card. Selected events get `ring-2 ring-cosmic/70`. Flagged events (start in Rahu or keep-in-mind) get a left `border-l-[3px] border-l-solar/70`.
  - An event's minimum height is 26px. All-day or pre-6am events park at the top as a 45-minute soft block.
  - Event time shows in **local time** (§11).
- **Empty state:** "Open day — No events yet — add one below, or sync Google on Home." Never show fake data unless the Mock badge is visible.
- **No profile:** replace the chips with a card: "Add your birth date to see today's chips" → `/profile`.
- **AddEventForm** (collapsible card; docked on desktop):
  - Fields: title, start, end (HH:mm), type (Meeting · Gym · Finance · Doctor · Other), and "Add Google Meet" checkbox.
  - Optional **target calendar** select (to build), default primary.
  - Submit POSTs `/api/calendar/events` with `start`/`end` from `localWallDateTime(date, hh:mm)` and `timeZone: browserTimeZone()`.
  - On success: refetch the events, then auto-open the tip for the new event. Show the "Saved locally…" message when simulated.
- **EventTipSheet** (bottom sheet on mobile, inline card on desktop):
  - Badge: Lean in (cosmic) / Keep in mind (solar) / Steady (muted). Headline, event title and local time.
  - Two actions (the first 2 lean-in tips or keep-in-mind items), plus up to 4 evidence chips.
  - Disclaimer line at the bottom.
  - Closes on Esc, backdrop tap or the ✕ button. Traps focus while open.
- **Week/Month:** `formatEventTimeShort`, and a caution dot on days with an event starting in Breather time. Week is a list on phones; Month shows event dots on phones and titles from `sm`. Tapping a day opens Day view.
- Rail layout lives in `lib/rail.ts`: chips stack without overlapping, and overlapping events share side-by-side lanes.

### 8.4 Chat `/chat`
1. **How today looks** card:
   - Weekday plus lord, for example "Friday · Venus".
   - Top 3–4 domain pills, 3–5 highlight chips (2 opportunity, 1 mood, 1 caution, 1 energy, de-duplicated) and the Rahu label.
   - Optional numerology line: "Personal Day 5 — Life Path 3".
   - Primary CTA "Open Day".
2. **How did it go?** card:
   - Shows today's events that have ended (`end <= now`), up to 5.
   - Each row has 👍/👎 plus tag toggles (`on track`, `draining`, `good timing`, `off vibe`) and an optional 280-character note.
   - Saved state is a check mark. Re-rating replaces the earlier entry.
   - **Omit the card entirely** until at least one event has ended.
3. **Q&A:**
   - One input ("Ask about Rahu Kaal, Life Path, palm lines…"). Answers render as cards with source file tags and a disclaimer.
   - Suggested prompt chips: "Best hour today?", "What's my Life Path?", "What is Rahu Kaal?", "Tips for a pitch".
- States: no profile (the today card shows a CTA to Profile) · loading skeletons · API error (one sentence plus Retry).

### 8.5 Prep `/prep`
- A guided chat, not a form. The guide asks who you are meeting, then their birth date (your details come from the profile).
- It replies with both Life Paths and ≤ 5 tips, then offers "Book a time" and "Prep someone else" and answers follow-ups from the training JSON.
- "Book a time" shows a date/time picker and an "Add Google Meet link" switch, then creates the event (or saves it locally). Slot suggestions from free/busy are still to build.
- This is secondary to Day.

### 8.6 Legacy Scores `/today`
- Four `ScoreRing`s (work, meetings, rest, socializing) plus the Rahu banner and the best-hour hint.
- **To build:** merge these into Day as a collapsible "Day energy" strip, then redirect `/today` → `/calendar`.

---

## 9. Design tokens

**Palette** (Tailwind `theme.extend.colors`):
```ts
// Calm, youthful wellness theme. Values are RGB triplets in globals.css :root, with a dark-mode override.
cosmic  #1F7A6E   // teal: primary, selected, Satro events
solar   #9E5C08   // honey: caution marks ONLY
zest    #F39167   // coral: hero CTA, sprigs, always with dark text
bloom   #8B7AC8   // lavender: accent, "now" line
orbit   #EAF3EF / card #FFFFFF / muted #DAE8E2   // mist, cards, fills
space   #1C2B29   // ink
```
- Chip tones are `.satro-chip-*` classes backed by `--chip-*` variables: mood lavender, energy seafoam, opportunity sage, caution honey.
- Never hardcode a colour or `bg-white` on a surface; use the tokens so dark mode keeps working.
- Headings use Lora (`font-serif`); body text uses the system font.
- Art lives in `components/Art.tsx`: original watercolour scenes and simple line art, no stock or copied illustrations. Keep it soft, positive and never fear-based.
- Apple elements: large titles, floating glass tab bar, segmented control (`.satro-segment`), checkboxes as iOS switches, bottom sheets with a grabber, 44px hit targets.
- Colour rule: zest and bloom are accents. Everything else stays paper and ink.

**Type:** Geist Sans variable (`--font-geist-sans`) with a system-ui fallback.

| Element | Classes |
|---|---|
| Page title | `text-xl sm:text-2xl font-semibold tracking-tight` |
| Subtitle | `text-sm text-space/55` |
| Section title | `text-sm font-semibold` |
| Label | `text-xs font-medium text-space/60` |
| Chip text | `text-[11px]` (compact `text-[10px] leading-[18px]`) |
| Hour labels | `text-[10px] sm:text-[11px] tabular-nums text-space/40` |
| Disclaimer | `text-[11px] sm:text-xs text-space/45` |

**Spacing and shape:**
- Container `max-w-5xl`, padding `px-3 sm:px-4`.
- Cards `rounded-2xl border border-orbit-muted/80 bg-white shadow-satro p-5` (tight variant `p-4`). Buttons `rounded-xl px-3.5 py-2 text-sm` (small `rounded-lg px-2.5 py-1.5 text-xs`). Chips `rounded-full px-2.5 py-0.5`. Pills `rounded-full px-2.5 py-1 text-[11px]`.
- Rail row 52px. Bottom nav tab icon 28px. Page bottom padding `pb-24` on mobile, to clear the nav.
- Hit targets ≥ 40px on mobile.

**Component classes** (`globals.css` `@layer components`):
- `.satro-card`, `.satro-card-tight`
- `.satro-btn` with `-primary` (cosmic, hover `cosmic-deep`), `-solar` (caution only), `-ghost` and `-sm`
- `.satro-input` (focus `border-cosmic ring-2 ring-cosmic/20`), `.satro-label`
- `.satro-page-title`, `.satro-page-sub`, `.satro-section-title`
- `.satro-domain-pill`, `.satro-skeleton`, `.satro-chip` with `-mood`, `-energy`, `-opportunity` and `-caution`

**Motion:** `.satro-fade-in` is 280ms with `cubic-bezier(0.22,1,0.36,1)` and translateY 4px → 0. Respect `prefers-reduced-motion`.

**Component inventory rules:**
- Keyword chip: short label, with an optional "· domain" (hidden in compact mode).
- Domain pill: favored / neutral / avoid.
- Event block: default / selected / flag / free.
- Caution banner: one line.
- One primary button per screen. The solar button is for caution actions only.
- Empty state: one sentence plus a CTA. Never fake data.

---

## 10. API routes (request/response shapes)

All routes are JSON. Server routes read the profile from the store (`data/user-profile.json` for now). Every error returns `{ error: string }` with a 4xx status, **except** the calendar routes: they degrade to mock mode with status 200 and include a `reason`.

| Method & path | Request | Response |
|---|---|---|
| `GET /api/config` | – | `{ googleConfigured: boolean, mockForced: boolean }` |
| `GET/POST /api/auth/[...nextauth]` | NextAuth | NextAuth |
| `GET /api/profile` | – | `{ profile: UserProfile, complete: boolean }` |
| `POST /api/profile` | `UserProfile` (partial OK; legacy `name` → `displayName`) | `200 { profile, complete: true, saved: true }` or `400 { error: "displayName and birthDate are required", profile }` |
| `GET /api/timeline?date=YYYY-MM-DD[&eventHour=10.5&eventEndHour=11.5&eventType=gym]` | – | `{ timeline: DayTimeline, tip: EventTip \| null }` |
| `GET /api/scores?date=YYYY-MM-DD` | – | `DayScores` (legacy) |
| `GET /api/calendar/events?from=ISO&to=ISO[&calendarIds=a,b]` | – | `{ events: CalEvent[], mode: "google" \| "mock", reason?: string, needsReauth?: boolean }` |
| `POST /api/calendar/events` | `{ summary, start, end, timeZone, type?, description?, withMeet?, calendarId? }` (start/end are floating local wall-clock `YYYY-MM-DDTHH:mm:ss`) | `{ mode: "google" \| "simulated", event: CalEvent \| null, payload?, message }` |
| `GET /api/calendar/list` *(to build)* | – | `{ calendars: GoogleCalendarInfo[], mode }` (mock: `[{id:"primary",summary:"Primary (mock)",primary:true,accessRole:"owner"}]`) |
| `GET/POST /api/calendar/prefs` *(to build)* | POST `{ selectedCalendarIds: string[], writeCalendarId: string }` | `{ selectedCalendarIds, writeCalendarId }` |
| `GET /api/chat` | – | `{ tip: { tip, source }, today: { date, weekday, weekdayLord, topDomains, chips, rahuKaal, disclaimer } }` |
| `POST /api/chat` | `{ question: string }` | `{ answer, sources: string[], matches: {source,excerpt}[], disclaimer }` |
| `GET /api/feedback?date=YYYY-MM-DD` | – | `{ entries: FeedbackEntry[] }` (no date → last 50) |
| `POST /api/feedback` | `{ eventId, eventSummary, date, rating: "up"\|"down", tags?: string[≤5], note?: string≤280 }` | `{ entry, saved: true }`. Replaces earlier feedback for the same `eventId` |
| `POST /api/prep` | `{ you:{name,birthDate}, them:{name,birthDate} }` | `PrepResult { you, them, tips[≤6 incl. disclaimer], disclaimer }` |

---

## 11. Local-timezone datetime handling (`lib/datetime.ts`)

**Known bug (already fixed): lunch at 12:30 PM showed as 12:30 AM.** The cause was floating datetimes being parsed or formatted as UTC, plus 12-hour formatting done by hand. Keep the fix in place and keep its test:

- `parseEventDate(s)`:
  - `YYYY-MM-DD` → local midnight (all-day).
  - A string with `Z` or `±HH:MM` → `new Date(s)`.
  - A **floating** `YYYY-MM-DDTHH:mm[:ss]` → `new Date(y, m-1, d, hh, mm, ss)`, i.e. local wall-clock. **Never** append `Z`.
- `formatEventTime(s)` → `Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit"})`, or "All day". **No `timeZone: "UTC"` anywhere.**
- `formatEventTimeShort(s)` → 24-hour compact, used in week/month cells.
- `localFractionalHour(s)` places events on the rail. `isSameLocalDay(s, day)` filters by day.
- `localWallDateTime(day, "HH:mm")` → `YYYY-MM-DDTHH:mm:00` (no Z). `browserTimeZone()` → IANA zone.
- **Create:** send `{ start: { dateTime: floating, timeZone }, end: {...} }` to Google, so Google stores the correct instant.
- **Server rule:** the server never turns local wall-clock into an instant in its own timezone. Pass the user's `timeZone` (from the request or profile) and let Google resolve it.
- For `/api/timeline` the date arrives as `YYYY-MM-DD` and is built as `new Date(date + "T12:00:00")`; noon avoids day-shift problems.
- `isAllDayEvent` → all-day events are not placed on the hour rail. Show them as top chips or soft blocks.
- Tests: `formatEventTime("2026-10-30T12:30:00")` contains "12:30" and "PM" (en-US). An RFC3339 `2026-10-30T07:00:00Z`, viewed with `TZ=Asia/Kolkata`, shows "12:30 PM".

---
## 12. Google Calendar sync (`lib/auth.ts`, `lib/google.ts`)

### 12.1 OAuth config
- Scopes: `openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly`.
  - The current code requests `calendar.freebusy`. **Replace it with `calendar.readonly`**, which covers `calendarList.list` and free/busy.
- Set `authorization.params`: `{ scope, access_type: "offline", prompt: "consent", include_granted_scopes: "true" }`.
- Session strategy is `jwt`. `secret: process.env.NEXTAUTH_SECRET`. **Remove the hardcoded `"satro-dev-secret-change-me"` fallback.**

### 12.2 Known bug to fix: access-token expiry falls back to mock
The current `jwt` callback stores `accessToken`, `refreshToken` and `accessTokenExpires`, but **never refreshes**. After about an hour, Google returns 401 and `listEvents` quietly falls back to mock events. Fix it in the JWT callback:

```ts
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) throw new Error("no_refresh_token");
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken, // Google may not rotate
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

callbacks: {
  async jwt({ token, account }) {
    if (account) {                         // first sign-in
      return {
        ...token,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,   // requires access_type=offline & prompt=consent
        accessTokenExpires: (account.expires_at ?? Math.floor(Date.now()/1000) + 3600) * 1000,
      };
    }
    if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60_000) return token;
    return refreshAccessToken(token);       // expired or <60s left
  },
  async session({ session, token }) {
    session.accessToken = token.accessToken;
    session.error = token.error;
    return session;
  },
}
```

Rules:
- If `account.refresh_token` is missing on first sign-in, log a warning. The UI then prompts "Reconnect Google (offline access needed)".
- When `session.error === "RefreshAccessTokenError"` or Google returns 401/`invalid_grant`, the API responds `{ mode: "mock", needsReauth: true, reason }`. The UI shows a solar banner with a "Reconnect" button (`signIn("google")`). **It does not quietly show mock data under a Live badge.**
- In `google.ts`, build `new google.auth.OAuth2(clientId, clientSecret)` and `setCredentials({ access_token })`. Do all refreshing in the JWT callback, not per request.

### 12.3 Reading (import)
- Call `calendarList.list` to get `GoogleCalendarInfo[]` for the picker. Default the selection to `["primary"]`.
- For each selected calendar, call `events.list({ calendarId, timeMin, timeMax, singleEvents: true, orderBy: "startTime", maxResults: 250 })` in parallel. Tag each event with `calendarId`, `calendarName` and `calendarColor`.
- Merge the results and dedupe by `iCalUID || id`. Sort by actual instant (`parseEventDate(start).getTime()`), not by string.
- Map each event:
  - `start = e.start.dateTime || e.start.date`
  - `satro = e.extendedProperties?.private?.satro === "true"`
  - `type = e.extendedProperties?.private?.satroType || inferType(summary)`
- Satro events saved locally (simulated creates) are merged in alongside the Google events.
- Mock mode triggers on any of: OAuth not configured, `SATRO_MOCK_CALENDAR=true`, user not signed in, or refresh failure. Mock data is 1-hour weekday events ("Team sync (mock)" / "Focus block (mock)") plus `local-events.json`.

### 12.4 Writing (push)
- Call `events.insert({ calendarId: writeCalendarId || "primary", conferenceDataVersion: withMeet ? 1 : 0, requestBody })` with:
  - `summary`, `description` ("Created by Satro Calendar · type=gym")
  - `start: { dateTime: floating, timeZone }`, `end: { dateTime: floating, timeZone }`
  - `extendedProperties: { private: { satro: "true", satroType: type } }`
  - for Meet: `conferenceData.createRequest = { requestId: "satro-<ts>", conferenceSolutionKey: { type: "hangoutsMeet" } }`
- **Never modify or delete events that are not Satro's.** Only events tagged `satro=true` may be edited or deleted from Satro.
- If the write fails or the user is not connected, save to `local-events.json` with `source: "mock"` and return `mode: "simulated"` with a clear message.
- Optional later: on connect, offer to push events that exist only locally.
- Disconnect: sign out, stop syncing, and offer "Delete Satro-created events from Google" (with a confirm dialog).

### 12.5 Calendar picker (to build: `CalendarPicker.tsx`)
- A checkbox list of calendars (colour dot, name, "Primary" badge) and a "Write new events to" select. Only calendars with `accessRole` `owner` or `writer` can be the write target.
- Persist to `/api/calendar/prefs` (and to `profile.selectedCalendarIds`). The Day view refetches when this changes.
- Placement: under Profile → "Calendars", and as the onboarding step after connecting.

---

## 13. Chat assistant behaviour & prompts

**Default mode is rule-based.** Answers come from the local JSON only (`lib/chat.ts`):
- Shortcut rules by regex:
  - `tip|today|best hour|rahu` → daily tip
  - `life path|numerology|pythagorean|chaldean` → Life Path explainer
  - `palm|heart line|head line|life line|fate line|mount` → palm summary
  - `photo|blur|retake|face|handwriting` → retake/privacy rules
  - `prep|meeting|pitch|talk` → Prep explainer
- Otherwise, flatten every training JSON into text chunks (20–500 characters), score them by token overlap, and return the top 4 as bullets with their source files.
- If nothing matches: "I only answer from Satro training JSON…" plus example questions.

**Morning card ("How today looks")**
- Shown on open, or after 05:00 local time. Built from `todayCardSummary(date, preferredDomains)`.
- Copy template: `"Good morning, {name}. {Weekday} · {Lord} day. Strongest: {topDomain1} {score}/10, {topDomain2}. Watch {rahuLabel}."` followed by the chips.
- At most 3 sentences.

**Evening card ("How did it go?")**
- Lists the events that ended today, up to 5. Feedback is stored with `POST /api/feedback`.
- Learning loop (`lib/feedback.ts`). A tapped tag with no thumb implies the rating ("draining" and "off vibe" count as down). Three "good timing" ratings on great-time tips raise that area by 0.5 the same way misses lower it:
  - Per `(eventType, chip tone, pattern)`, keep `up` and `down` counts.
  - If a user downvotes `lean-in` tips for a type ≥ 3 times with "off vibe", reduce the opportunity weight for that domain by 0.5 for that user. Cap the change at ±1.5.
  - Show "Satro is learning: you rate morning gym sessions highly" after 5+ entries.
- Optional evening summary at 21:00 local: "{n} events rated · {k} on track".

**Optional LLM mode** (only when `SATRO_LLM_API_KEY` is set). Implemented in `lib/assistant.ts`, whose `SYSTEM_PROMPT` supersedes the prompt below (Satro's friend voice, §14.1):
- Crisis messages never reach the model. Any API failure, refusal, cut-off reply or `isOnBrand` failure falls back to the rule-based reply.
- Best times come from `momentFacts`; the model phrases them and `isOnBrand` checks the time survived. Birth date is never sent, only derived results.
- Replies are labelled "AI-written". `/api/chat` limits each sender to 20 AI requests a minute. History and Prep context come from the client and are treated as data.
- The LLM phrases answers. It must not invent astrology.
- Pass: the system prompt below, the top 4 retrieved chunks, the user's today card JSON and the question.
- Keep the rule-based answer as the fallback whenever the call fails.

System prompt:
```
You are Satro Guide, a calm, brief assistant inside the Satro Calendar app.
Ground every statement ONLY in the provided CONTEXT (Satro training JSON excerpts and today's computed card). If the context does not cover the question, say so and suggest a question it can answer.
Style: ≤ 80 words, plain language, short keyword chips where natural, no fear language, no certainty ("may", "traditionally", "symbolically").
Never give medical, financial, legal, or psychological advice; for health/money questions add "check with a qualified professional".
Never prescribe gemstones; mention "only after professional advice" if gems come up.
Always end with: "Symbolic guidance for entertainment/education."
```

Morning prompt: `"Write the 'How today looks' card for {name}. CONTEXT: {todayCardJson}. Max 3 sentences, then list 3–5 chips verbatim."`
Feedback follow-up prompt: `"User rated '{event}' {rating} with tags {tags}. CONTEXT: tip shown {tipJson}. Reply in 1 sentence acknowledging and noting one thing to try next time."`

---

## 14. Disclaimer, privacy & commercial flags
- Global banner text: **"Traditional / symbolic guidance for entertainment — not predictive certainty. A Tuto project by Pluto Theory."**
- The tip sheet, Chat answers and Prep results each repeat a one-line disclaimer.
- Never use phrasing like "will happen", "guaranteed", diagnoses, or investment advice.
- Do not retain biometric images. Any photo feature deletes the image after analysis, and face/handwriting reading is out of scope.
- Personal data (profile, events, feedback) stays in git-ignored runtime files. When multi-user mode lands, key everything by the Google `sub`.
- Remedies: at most one mantra, one colour and the fasting day, always with the gemstone caveat.

---

### 14.1 Voice and words
- Satro talks like an encouraging friend: warm, short, positive, plain. Astrology jargon stays out of screens and chat. All friendly words live in `lib/vibes.ts`.
- Rahu Kaal → "Breather time". favored / neutral / avoid → "Great vibe" / "Good to go" / "Take it easy". Lean in / Keep in mind / Steady → "Great time" / "Go gentle" / "Good to go". Engine names in code are unchanged.
- Going deeper: `Explain` and the chat give a two-line explainer, and only there may traditional terms such as Rahu Kaal appear.
- `data/moments.json` holds life moments (love, friends, work, study, life). `lib/moments.ts` finds the best slot and writes the reply. Replies never predict outcomes; fixed dates such as exams get prep times.
- Moment and explainer replies carry a disclaimer but no source tags, which supersedes the M7 "Q&A cites source files" check for them. Crisis or abuse phrases skip all of this and point to trusted people and local helplines.
- Build a daily habit with useful loops such as the "right now" vibe and next best time. Never use fear, guilt or streak-loss pressure, and always leave the decision with the user.

---

## 15. What's already built vs. still to build

**Already built (in the starter zip)**
- [x] Next.js 14 App Router, Tailwind tokens, Geist, the `.satro-*` component classes
- [x] Desktop top Nav + mobile **BottomNav** (Day · Chat · Prep · Profile) + DisclaimerBanner
- [x] Home hero + `HomeAuth` (Google sign-in) + `HomeFunnel` (profile-aware CTA)
- [x] Profile: name, birth date, time and place, persisted to `/api/profile` and localStorage. The model already supports `preferredDomains`, but **the UI is not a multi-select yet**
- [x] `timeline-keywords.json` (30 chips), `buildDayTimeline`, `domainScoresFromDay`, `tipForEvent`, `todayCardSummary`
- [x] Day view: 6a–midnight rail, chips, Rahu shade, event blocks, Week/Month views, Live/Mock badge
- [x] AddEventForm → POST events with local wall-clock + `timeZone` (Google push, or a local simulated save)
- [x] EventTipSheet (Lean in / Keep in mind / Steady)
- [x] Chat: today card, how-did-it-go feedback (`/api/feedback`), corpus Q&A
- [x] Prep lite: Life Path compare → ≤ 5 tips → book with optional Meet
- [x] Legacy `/today` channel scores
- [x] Timezone fix for the "12:30 AM lunch" bug (`lib/datetime.ts`)

**Still to build / fix**
- [x] **Token refresh** in the JWT callback, plus a `needsReauth` UI (§12.2). Needs a live Google test
- [x] Scope change `calendar.freebusy` → `calendar.readonly`. Remove the hardcoded NextAuth secret fallback
- [ ] **Multi-calendar picker** (`/api/calendar/list`, `/api/calendar/prefs`, `CalendarPicker`, multi-calendar `listEvents`, write target)
- [x] **Domain multi-select on Profile** (`DomainMultiSelect`, ordered priority)
- [x] Current-timezone field. The profile TZ is the server fallback for creates
- [x] `lib/zodiac.ts` + numerology overlays (Personal Day nudge, personal-affinity day, PY 4/8 stress) in the timeline
- [ ] Hour-level scoring from the §7.4 Rahu hour rule (needed by the Prep slot picker)
- [x] Onboarding stepper `/onboarding`. Redirect first-time users there. The calendar pick in step 4 waits for M6
- [x] Event `type` persisted in `extendedProperties.private.satroType`, plus summary inference
- [ ] Sort events by instant, not string. Dedupe across calendars
- [x] Merge legacy Scores into Day ("Day energy" strip). Redirect `/today`
- [x] Bottom-sheet behaviour for EventTipSheet on mobile (backdrop, Esc, focus trap, swipe down)
- [x] Feedback learning loop (§13). It adjusts day scores and chips; moment best times don't use it yet
- [x] `.gitignore` for runtime data files. Vitest: auth, numerology, zodiac, scoring, timeline, tips
- [x] Vitest: `datetime` and rail layout tests (§17)
- [ ] Later: real sunrise/sunset for Rahu Kaal, a DB for multi-user, one daily push nudge

---

## 16. Build milestones (do them in order; each must pass its acceptance criteria)

**M0 — Scaffold & tokens**
Create the project per §2 (or unzip the starter), and add the Tailwind tokens and `globals.css` classes from §9.
- ✅ `npm run build` passes.
- ✅ The Home page renders the cosmic hero.
- ✅ The disclaimer banner shows on every route.

**M1 — Data layer & engine**
Copy the `data/*.json` files. Implement `data.ts`, `scoring.ts`, `numerology.ts`, `zodiac.ts` and `timeline.ts` per §7.
- ✅ `scoreDay` is deterministic for a fixed date.
- ✅ `buildDayTimeline` returns ≤ 12 chips with no repeated `keywordId`, all 10 domains, and preferred domains first.
- ✅ Life Path(1991-03-14) = 1.
- ✅ Rahu Kaal on a Wednesday spans 12:00–13:30.
- ✅ `tipForEvent` passes the four canonical examples (§7.9).

**M2 — Profile & onboarding**
Build `/api/profile`, the Profile page with `DomainMultiSelect` and the timezone field, and the `/onboarding` stepper.
- ✅ Saving without a name or birth date gives 400 and an inline error.
- ✅ Domain order is kept after a reload.
- ✅ Day shows the "add birth date" CTA until the profile is complete.
- ✅ First run goes to onboarding.

**M3 — Day timeline UI**
Build DayTimeline, the domain pills, the Rahu banner and shade, and the Week/Month views.
- ✅ The rail runs 6a→midnight.
- ✅ Chips wrap and never clip at 360px width.
- ✅ An event at 12:30 local shows "12:30 PM" and sits at the right rail offset.
- ✅ The empty state shows when there are no events.

**M4 — Add event & tips**
Build AddEventForm and EventTipSheet as a bottom sheet.
- ✅ A created event appears immediately and its tip opens automatically.
- ✅ The Gym + Body ready day shows **Lean in**.
- ✅ A Finance event inside Rahu shows **Keep in mind** with a solar flag.
- ✅ The sheet closes on Esc and on backdrop tap.

**M5 — Google OAuth + token refresh**
Implement §12.1–12.2.
- ✅ Sign-in returns a `refresh_token` (logged as present: boolean, never logged as a value).
- ✅ After forcing `accessTokenExpires = Date.now() - 1`, the next request refreshes and stays **Live**. The badge does not flip to Mock.
- ✅ After revoking access in Google, the UI shows "Reconnect", not quiet mock data.

**M6 — Google import/push + multi-calendar**
Implement §12.3–12.5.
- ✅ The picker lists the real calendars.
- ✅ Selecting two calendars merges their events with colour dots.
- ✅ A new event lands in the chosen write calendar with `satro=true` and `satroType`.
- ✅ Foreign events can't be edited from Satro.
- ✅ Meet links appear when requested.

**M7 — Chat assistant**
Build the today card, the how-did-it-go card (omitted until an event ends), Q&A, and the optional LLM mode behind env.
- ✅ Feedback persists and re-rating replaces the earlier entry.
- ✅ Q&A cites source files.
- ✅ With no LLM key, every answer is rule-based.
- ✅ The disclaimer shows on every answer.

**M8 — Polish & merge**
Merge Scores into Day and redirect `/today`. Add mobile bottom-nav safe-area handling, a11y (focus rings, `aria-pressed`, labels) and reduced motion.
- ✅ Lighthouse mobile accessibility ≥ 90.
- ✅ No horizontal scroll at 360px.
- ✅ One primary button per screen.

**M9 — Persistence & deploy (optional)**
Move the runtime JSON to SQLite/Prisma or Postgres, keyed by Google `sub`, then deploy (Vercel) with the production redirect URI added in Google Cloud.
- ✅ Two Google accounts see separate profiles and feedback.
- ✅ The env vars are set in the host and none are in the repo.

---

## 17. Testing checklist

**Unit (Vitest)**
- [ ] `lifePathFromBirthDate`: 1991-03-14 → 1. Master numbers kept (for example a date summing to 11 stays 11).
- [ ] `nameNumber("MAYA RAO")` uses Pythagorean values, consistent with `numerology.json`.
- [ ] `personalYear`, `personalMonth`, `personalDay` reduce to 1–9.
- [ ] `rashiFromBirthDate`: 1990-05-15 → Vrishabha/Venus. 2000-01-10 → Dhanu/Jupiter. 2000-01-14 → Makara/Saturn.
- [ ] `rahuKaalWindow`: every weekday matches the §7.4 table.
- [ ] `scoreDay`: clamps to 0–10, and labels at the 3/6 thresholds.
- [ ] `buildDayTimeline`: ≤ 12 chips, unique keywordIds, every chip inside 6–24, at least one caution chip overlapping Rahu.
- [ ] `tipForEvent`: the four canonical examples.
- [ ] `parseEventDate` and `formatEventTime`: floating `T12:30:00` → "12:30 PM". `Z` time converted under `TZ=Asia/Kolkata`. All-day → "All day".
- [ ] `localWallDateTime` has no `Z`.
- [ ] JWT callback with mocked `fetch`: no refresh while the token is valid; refresh when expired; a failure sets `error`.

**Integration / manual**
- [ ] Mock mode (no env values): every page works, the Mock badge is visible, creates show "Saved locally".
- [ ] Google live: sign in, see the real events, create an event with Meet, then check the Google Calendar web UI for the time, timezone, `satro` tag and Meet link.
- [ ] Token expiry: wait 60+ minutes, or force expiry, and confirm it is still Live.
- [ ] Multi-calendar: select work + personal and confirm the events merge. The write target is honoured.
- [ ] Timezones: run the browser in Asia/Kolkata and in America/Los_Angeles. A 12:30 PM lunch shows 12:30 PM in both when created locally.
- [ ] Profile: missing fields are blocked. Domain order is kept. The Day pills reflect the order.
- [ ] Chat: the how-did-it-go card is hidden before any event ends. Feedback saves. Q&A cites sources.
- [ ] Mobile 360×740: bottom nav doesn't cover content, chips wrap, the sheet is usable one-handed.
- [ ] Disclaimer shows on Home, Day, the tip sheet, Chat answers and Prep.
- [ ] Security: `git grep -nE "GOCSPX|ya29\.|apps.googleusercontent.com"` returns nothing. `.env.local` is ignored. Runtime data files are ignored.

---

## 18. Notes for Claude Code
- Prefer small, typed, pure functions in `lib/`. Keep React components presentational and fetch in pages.
- Server-only modules (`fs`, `googleapis`) must never be imported into client components. Types are fine with `import type`.
- Don't add new dependencies without a reason. Allowed additions: `vitest`, `@anthropic-ai/sdk` (AI chat), `suncalc` (for real Rahu Kaal), `zod` (request validation), and an ORM at M9.
- After each milestone, report a summary of what changed, the test results, and any decisions you made.
- If anything here conflicts with the existing code, **this spec wins**, except for the timezone helpers, which are already correct.
