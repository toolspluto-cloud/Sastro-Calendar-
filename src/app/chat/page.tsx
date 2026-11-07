"use client";

import { Explain } from "@/components/Explain";
import { RetryNote } from "@/components/RetryNote";
import { getJson, gentleScroll } from "@/lib/api";
import { MomentPicker } from "@/components/MomentPicker";
import type { MomentChip } from "@/lib/moments";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  formatEventTime,
  isAllDayEvent,
  localFractionalHour,
  parseEventDate,
} from "@/lib/datetime";
import { FEEDBACK_TAGS, ratingForTag } from "@/lib/feedback";
import { KeywordChip } from "@/components/KeywordChip";
import {
  PROFILE_STORAGE_KEY,
  isProfileComplete,
  normalizeProfile,
} from "@/lib/profile";

type Msg = { role: "user" | "guide"; text: string; note?: string };

type TodayCard = {
  date: string;
  weekday: string;
  weekdayLord: string;
  topDomains: Array<{ domain: string; score: number; label: string }>;
  chips: Array<{
    id: string;
    label: string;
    tone: "mood" | "energy" | "opportunity" | "caution";
    domain: string;
  }>;
  rahuKaal?: { label: string };
  numerology?: { lifePath: number; personalDay: number };
  rashi?: { name: string; lord: string };
  disclaimer: string;
};

type PastEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  type?: string;
};

type Rating = { rating: "up" | "down"; tags: string[]; note?: string };
type FeedbackMap = Record<string, Rating>;

const GREETING = "Hey! What are you planning? Ask me about a date, an exam, a big meeting, anything.";

function morningLine(today: TodayCard, name: string) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const [first, second] = [...today.topDomains].sort((a, b) => b.score - a.score);
  const strongest = `Strongest: ${first.domain} ${first.score}/10${second ? `, then ${second.domain}` : ""}.`;
  return `${hello}${name ? `, ${name}` : ""}. Happy ${today.weekday}! ${strongest}`;
}

export default function ChatPage() {
  const [tip, setTip] = useState("");
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [today, setToday] = useState<TodayCard | null>(null);
  const [todayReady, setTodayReady] = useState(false);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [pastReady, setPastReady] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMap>({});
  const [profileOk, setProfileOk] = useState(true);
  const [moments, setMoments] = useState<MomentChip[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [name, setName] = useState("");
  const [insight, setInsight] = useState("");
  const [summary, setSummary] = useState("");
  const [savedId, setSavedId] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(() => {
    setLoadFailed(false);
    const failed = () => setLoadFailed(true);
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw && isProfileComplete(normalizeProfile(JSON.parse(raw)))) {
        setProfileOk(true);
      } else {
        getJson("/api/profile")
          .then((d) => setProfileOk(Boolean(d.complete)))
          .catch(failed);
      }
    } catch {
      /* ignore */
    }

    getJson("/api/chat")
      .then((d) => {
        setTip(d.tip?.tip || "");
        if (d.today) setToday(d.today);
        setMoments(d.moments || []);
        setName(d.name || "");
        setInsight(d.insight || "");
        // Keep the conversation if this is a retry.
        setMsgs((m) => (m.length ? m : [{ role: "guide", text: GREETING }]));
      })
      .catch(failed)
      .finally(() => setTodayReady(true));

    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const q = new URLSearchParams({
      from: from.toISOString(),
      to: now.toISOString(),
    });
    getJson(`/api/calendar/events?${q}`)
      .then((d) => {
        const list = (d.events || []) as PastEvent[];
        setPastEvents(
          list
            .filter(
              (e) =>
                !isAllDayEvent(e.start) && parseEventDate(e.end).getTime() <= Date.now()
            )
            .slice(-5)
        );
      })
      .catch(failed)
      .finally(() => setPastReady(true));

    getJson(`/api/feedback?date=${format(now, "yyyy-MM-dd")}`)
      .then((d) => {
        const map: FeedbackMap = {};
        for (const e of d.entries || []) {
          map[e.eventId] = { rating: e.rating, tags: e.tags || [], note: e.note };
        }
        setFeedback(map);
        setSummary(d.summary || "");
      })
      .catch(failed);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // The first message is the greeting; only follow a real conversation.
  useEffect(() => {
    if (msgs.length > 1) chatEnd.current?.scrollIntoView({ behavior: gentleScroll(), block: "center" });
  }, [msgs, busy]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setInput("");
    ask(q);
  }

  async function ask(q: string) {
    if (busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const data = await getJson("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          history: msgs.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });
      setMsgs((m) => [
        ...m,
        {
          role: "guide",
          text: data.answer,
          note: [
            data.sources?.length
              ? `From Satro's notes: ${data.sources
                  .map((src: string) => src.replace(".json", ""))
                  .join(", ")}.`
              : "",
            data.disclaimer,
          ]
            .filter(Boolean)
            .join(" "),
        },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "guide", text: "I couldn't connect just now. Try that again?" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function rate(ev: PastEvent, next: Rating) {
    setFeedback((f) => ({ ...f, [ev.id]: next }));
    const date = format(parseEventDate(ev.start), "yyyy-MM-dd");
    try {
      await getJson("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...next,
          eventId: ev.id,
          eventSummary: ev.summary,
          eventType: ev.type,
          date,
          startHour: localFractionalHour(ev.start),
          endHour: localFractionalHour(ev.end),
        }),
      });
      setSavedId(ev.id);
      const fresh = await getJson(`/api/feedback?date=${date}`);
      setSummary(fresh.summary || "");
      setInsight((await getJson("/api/chat")).insight || "");
    } catch {
      setLoadFailed(true);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 satro-fade-in">
      <div>
        <h1 className="satro-page-title">Ask Satro</h1>
        <p className="satro-page-sub">
          Your vibe check, your plans, and anything on your mind.
        </p>
      </div>

      {loadFailed && <RetryNote onRetry={loadAll} />}

      {!profileOk && (
        <div className="rounded-2xl border border-solar/20 bg-solar/[0.07] px-4 py-3 text-sm">
          Finish your{" "}
          <Link href="/profile" className="font-medium text-cosmic underline">
            birth profile
          </Link>{" "}
          so your vibes feel like you.
        </div>
      )}

      {/* How today looks */}
      <section className="satro-card space-y-3 border-l-[3px] border-l-cosmic">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="satro-section-title text-cosmic">How today looks</h2>
          {today && (
            <span className="text-[11px] text-space/70">
              {today.weekday} · {today.weekdayLord} day
            </span>
          )}
        </div>
        {!todayReady ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="satro-skeleton h-6 w-16 rounded-full" />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="satro-skeleton h-5 w-20 rounded-full" />
              ))}
            </div>
          </div>
        ) : today ? (
          <>
            <p className="text-[15px] leading-snug text-space/80">
              {morningLine(today, name)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {today.topDomains.map((d) => (
                <span key={d.domain} className="satro-domain-pill">
                  <span className="text-space/70">{d.domain}</span>
                  <span
                    className={`tabular-nums ${
                      d.label === "favored"
                        ? "text-cosmic"
                        : d.label === "avoid"
                          ? "text-solar"
                          : "text-space/70"
                    }`}
                  >
                    {d.score}
                    <span className="text-space/70">/10</span>
                  </span>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {today.chips.map((c) => (
                <KeywordChip
                  key={c.id}
                  label={c.label}
                  tone={c.tone}
                  domain={c.domain}
                />
              ))}
            </div>
            {today.numerology && (
              <p className="text-[13px] text-space/70">
                Today&apos;s number {today.numerology.personalDay} · Life Path{" "}
                {today.numerology.lifePath}
                {today.rashi ? ` · Sun sign (approx.): ${today.rashi.name}` : ""}
              </p>
            )}
            {today.rahuKaal?.label && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-solar">
                <span className="flex-1">{today.rahuKaal.label}</span>
                <Explain id="breather" />
              </div>
            )}
            <Link href="/calendar" className="satro-btn-primary w-full">
              Open Day
            </Link>
          </>
        ) : (
          <p className="text-sm text-space/70">Couldn’t load today’s card.</p>
        )}
        <p className="text-[11px] text-space/70">
          Traditional / symbolic entertainment guidance — not predictive
          certainty.
        </p>
      </section>

      {insight && (
        <p className="rounded-2xl bg-cosmic/[0.08] px-4 py-3 text-sm font-medium text-cosmic">
          {insight}
        </p>
      )}

      {/* How did it go: hidden until an event has ended */}
      {pastReady && pastEvents.length > 0 && (
        <section className="satro-card space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="satro-section-title">How did it go?</h2>
            {summary && <span className="text-[11px] text-space/70">{summary}</span>}
          </div>
          <ul className="space-y-2.5">
            {pastEvents.map((ev) => {
              const fb = feedback[ev.id];
              const thumb = (rating: "up" | "down", emoji: string, label: string) => (
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={fb?.rating === rating}
                  onClick={() => rate(ev, { tags: fb?.tags ?? [], note: fb?.note, rating })}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-base transition active:scale-90 ${
                    fb?.rating === rating ? "bg-cosmic/20" : "bg-orbit-muted/60"
                  }`}
                >
                  {emoji}
                </button>
              );
              return (
                <li key={ev.id} className="rounded-2xl bg-orbit-muted/30 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium">{ev.summary}</div>
                      <div className="text-xs text-space/70">
                        {formatEventTime(ev.start)}
                        {savedId === ev.id && (
                          <span role="status" className="ml-1.5 font-semibold text-cosmic">
                            ✓ Saved
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {thumb("up", "👍", "It went well")}
                      {thumb("down", "👎", "It didn't go well")}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {FEEDBACK_TAGS.map((tag) => {
                      const on = fb?.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={Boolean(on)}
                          className={`min-h-8 rounded-full px-3 text-xs font-medium transition active:scale-95 ${
                            on ? "bg-cosmic/15 text-cosmic" : "bg-orbit-card text-space/70"
                          }`}
                          onClick={() =>
                            rate(ev, {
                              note: fb?.note,
                              rating: fb?.rating ?? ratingForTag(tag),
                              tags: on
                                ? fb.tags.filter((t) => t !== tag)
                                : [...(fb?.tags ?? []), tag],
                            })
                          }
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  {fb && (
                    <input
                      className="satro-input mt-2"
                      aria-label={`Note about ${ev.summary}`}
                      placeholder="Add a note (optional)"
                      maxLength={280}
                      defaultValue={fb.note ?? ""}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      onBlur={(e) => {
                        if (e.target.value !== (fb.note ?? "")) {
                          rate(ev, { ...fb, note: e.target.value });
                        }
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tip && (
        <div className="rounded-2xl border border-cosmic/20 bg-cosmic/[0.05] px-4 py-3 text-sm">
          <span className="font-medium text-cosmic">Today&apos;s tip · </span>
          <span className="text-space/80">{tip}</span>
        </div>
      )}

      <MomentPicker moments={moments} onPick={ask} />

      <div className="satro-card flex min-h-[260px] flex-col gap-3 p-4 sm:min-h-[280px]">
        <div className="flex-1 space-y-2.5 overflow-y-auto">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`max-w-[92%] rounded-[18px] px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-wrap ${
                m.role === "user"
                  ? "ml-auto bg-cosmic text-on-cosmic"
                  : "bg-orbit-muted/80 text-space"
              }`}
            >
              {m.text}
              {m.note && <div className="mt-1.5 text-[11px] opacity-80">{m.note}</div>}
            </div>
          ))}
          {busy && (
            <div className="max-w-[40%] rounded-2xl bg-orbit-muted/80 px-3 py-2 text-xs text-space/70">
              Thinking…
            </div>
          )}
          <div ref={chatEnd} />
        </div>
        <form
          onSubmit={send}
          className="flex gap-2 border-t border-orbit-muted/80 pt-3"
        >
          <input
            className="satro-input"
            aria-label="Ask Satro anything"
            placeholder="When should I text them first?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="satro-btn-ghost shrink-0" disabled={busy}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
