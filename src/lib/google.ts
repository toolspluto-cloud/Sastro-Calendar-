import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions, isGoogleConfigured } from "./auth";
import { resolveEventType, type EventType } from "./eventType";
import { runtimeFile } from "./store";

export type CalEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  htmlLink?: string;
  hangoutLink?: string;
  satro?: boolean;
  type?: EventType;
  source: "google" | "mock";
};

const LOCAL_EVENTS_PATH = runtimeFile("local-events.json");

function readLocalEvents(): CalEvent[] {
  try {
    if (!fs.existsSync(LOCAL_EVENTS_PATH)) {
      fs.writeFileSync(LOCAL_EVENTS_PATH, "[]\n", "utf8");
      return [];
    }
    const raw = JSON.parse(fs.readFileSync(LOCAL_EVENTS_PATH, "utf8"));
    return Array.isArray(raw) ? (raw as CalEvent[]) : [];
  } catch {
    return [];
  }
}

function writeLocalEvents(events: CalEvent[]) {
  fs.mkdirSync(path.dirname(LOCAL_EVENTS_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_EVENTS_PATH, JSON.stringify(events, null, 2) + "\n");
}

function eventOverlapsRange(ev: CalEvent, from: Date, to: Date): boolean {
  const start = new Date(ev.start);
  const end = new Date(ev.end || ev.start);
  if (Number.isNaN(start.getTime())) return false;
  const endMs = Number.isNaN(end.getTime()) ? start.getTime() : end.getTime();
  return start.getTime() < to.getTime() && endMs > from.getTime();
}

export function localEventsInRange(from: Date, to: Date): CalEvent[] {
  return readLocalEvents().filter((e) => eventOverlapsRange(e, from, to));
}

function persistLocalEvent(event: CalEvent): CalEvent {
  const all = readLocalEvents();
  all.push(event);
  writeLocalEvents(all);
  return event;
}

function buildLocalEvent(input: {
  summary: string;
  start: string;
  end: string;
  withMeet?: boolean;
  type: EventType;
}): CalEvent {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    summary: input.summary,
    start: input.start,
    end: input.end,
    satro: true,
    type: input.type,
    source: "mock",
    hangoutLink: input.withMeet
      ? `https://meet.google.com/mock-${Date.now().toString(36)}`
      : undefined,
  };
}

function mergeAndSort(a: CalEvent[], b: CalEvent[]): CalEvent[] {
  const byId = new Map<string, CalEvent>();
  for (const e of [...a, ...b]) byId.set(e.id, e);
  return Array.from(byId.values()).sort((x, y) =>
    String(x.start).localeCompare(String(y.start))
  );
}

export function isAuthFailure(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as {
    code?: number | string;
    status?: number;
    message?: string;
    response?: { status?: number; data?: { error?: string } };
  };
  // gaxios reports `code` as a number or a string depending on version.
  const statuses = [err.code, err.status, err.response?.status].map(Number);
  const msg = String(err.message || "").toLowerCase();
  const gErr = String(err.response?.data?.error || "").toLowerCase();
  return (
    statuses.includes(401) ||
    // A plain 403 can be a rate limit; only a scope problem needs a new sign-in.
    (statuses.includes(403) && msg.includes("insufficient")) ||
    msg.includes("invalid_grant") ||
    msg.includes("invalid credentials") ||
    msg.includes("unauthorized") ||
    gErr.includes("invalid_grant")
  );
}

function calendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

const REAUTH_REASON = "Sample events until you reconnect.";

export function mockEvents(from: Date, to: Date): CalEvent[] {
  const day = new Date(from);
  day.setHours(10, 0, 0, 0);
  const events: CalEvent[] = [];
  let i = 0;
  while (day <= to && i < 8) {
    if (day.getDay() !== 0 && day.getDay() !== 6) {
      const start = new Date(day);
      start.setHours(10 + (i % 3), 0, 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);
      events.push({
        id: `mock-${start.toISOString()}`,
        summary: i % 2 === 0 ? "Team sync (mock)" : "Focus block (mock)",
        start: start.toISOString(),
        end: end.toISOString(),
        satro: false,
        source: "mock",
      });
      i++;
    }
    day.setDate(day.getDate() + 1);
  }
  return events;
}

function withLocal(
  base: CalEvent[],
  from: Date,
  to: Date,
  mode: "google" | "mock",
  reason?: string
): { events: CalEvent[]; mode: "google" | "mock"; reason?: string } {
  const local = localEventsInRange(from, to);
  const events =
    mode === "mock" ? mergeAndSort(local, base) : mergeAndSort(base, local);
  return reason ? { events, mode, reason } : { events, mode };
}

export async function listEvents(from: Date, to: Date): Promise<{
  events: CalEvent[];
  mode: "google" | "mock";
  reason?: string;
  needsReauth?: boolean;
}> {
  if (!isGoogleConfigured()) {
    return withLocal(
      mockEvents(from, to),
      from,
      to,
      "mock",
      "Sample events for now."
    );
  }
  if (process.env.SATRO_MOCK_CALENDAR === "true") {
    return withLocal(
      mockEvents(from, to),
      from,
      to,
      "mock",
      "Sample events for now."
    );
  }

  const session = await getServerSession(authOptions);
  const reauthResult = () => ({
    ...withLocal(mockEvents(from, to), from, to, "mock", REAUTH_REASON),
    needsReauth: true,
  });
  if (session?.error === "RefreshAccessTokenError") return reauthResult();

  const accessToken = session?.accessToken;
  if (!accessToken) {
    return withLocal(
      mockEvents(from, to),
      from,
      to,
      "mock",
      "Sample events for now. Connect Google to see yours."
    );
  }

  try {
    const calendar = calendarClient(accessToken);
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });

    const events: CalEvent[] = (res.data.items || []).map((e) => ({
      id: e.id || crypto.randomUUID(),
      summary: e.summary || "(no title)",
      start: e.start?.dateTime || e.start?.date || "",
      end: e.end?.dateTime || e.end?.date || "",
      htmlLink: e.htmlLink || undefined,
      hangoutLink: e.hangoutLink || undefined,
      satro: e.extendedProperties?.private?.satro === "true",
      type: resolveEventType(e.extendedProperties?.private?.satroType, e.summary || ""),
      source: "google" as const,
    }));

    // Still surface locally created Satro events alongside Google.
    return withLocal(events, from, to, "google");
  } catch (e) {
    if (isAuthFailure(e)) return reauthResult();
    const reason =
      e instanceof Error
        ? `Google Calendar API error: ${e.message}`
        : "Google Calendar API error";
    return withLocal(mockEvents(from, to), from, to, "mock", reason);
  }
}

/** The Google event body. The type tag lets Satro read it back later. */
export function eventRequestBody(input: {
  summary: string;
  description?: string;
  start: string;
  end: string;
  withMeet?: boolean;
  timeZone?: string;
  type?: string;
}) {
  const type = resolveEventType(input.type, input.summary);
  const tz = input.timeZone || "UTC";
  return {
    summary: input.summary,
    description: input.description || `Created by Satro Calendar · type=${type}`,
    start: { dateTime: input.start, timeZone: tz },
    end: { dateTime: input.end, timeZone: tz },
    extendedProperties: { private: { satro: "true", satroType: type } },
    ...(input.withMeet
      ? {
          conferenceData: {
            createRequest: {
              requestId: `satro-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  };
}

export async function createEvent(input: {
  summary: string;
  description?: string;
  start: string;
  end: string;
  withMeet?: boolean;
  timeZone?: string;
  type?: string;
}): Promise<{
  mode: "google" | "simulated";
  event: CalEvent | null;
  payload?: unknown;
  message: string;
  needsReauth?: boolean;
}> {
  const payload = eventRequestBody(input);
  const type = resolveEventType(input.type, input.summary);

  const simulate = (message: string) => {
    const event = persistLocalEvent(buildLocalEvent({ ...input, type }));
    return {
      mode: "simulated" as const,
      event,
      payload,
      message,
    };
  };

  if (!isGoogleConfigured()) {
    return simulate(
      "Saved locally — set GOOGLE_CLIENT_ID/SECRET and sign in to write to Google Calendar."
    );
  }

  if (process.env.SATRO_MOCK_CALENDAR === "true") {
    return simulate("Saved locally (SATRO_MOCK_CALENDAR=true).");
  }

  const simulateReauth = () => ({
    ...simulate("Saved locally — Google session expired, reconnect to sync."),
    needsReauth: true,
  });

  let accessToken: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    if (session?.error === "RefreshAccessTokenError") return simulateReauth();
    accessToken = session?.accessToken;
  } catch (e) {
    return simulate(
      `Saved locally — session error: ${
        e instanceof Error ? e.message : "unknown"
      }`
    );
  }

  if (!accessToken) {
    return simulate(
      "Saved locally — sign in with Google to create a real Calendar event."
    );
  }

  try {
    const calendar = calendarClient(accessToken);
    const res = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: input.withMeet ? 1 : 0,
      requestBody: payload,
    });

    return {
      mode: "google",
      event: {
        id: res.data.id || "",
        summary: res.data.summary || input.summary,
        start: res.data.start?.dateTime || input.start,
        end: res.data.end?.dateTime || input.end,
        htmlLink: res.data.htmlLink || undefined,
        hangoutLink: res.data.hangoutLink || undefined,
        satro: true,
        type,
        source: "google",
      },
      message: "Event created on Google Calendar.",
    };
  } catch (e) {
    if (isAuthFailure(e)) return simulateReauth();
    const detail = e instanceof Error ? e.message : "API error";
    return simulate(
      `Saved locally — Google Calendar unavailable (${detail}).`
    );
  }
}
