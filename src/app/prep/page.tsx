"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gentleScroll } from "@/lib/api";
import { browserTimeZone, localWallDateTime } from "@/lib/datetime";
import { isProfileComplete, normalizeProfile, type UserProfile } from "@/lib/profile";

type PrepResult = {
  you: { name: string; lifePath: number; theme: string };
  them: { name: string; lifePath: number; theme: string };
  tips: string[]; // last entry is the disclaimer line
  disclaimer: string;
};

type Message = {
  role: "guide" | "you";
  text: string;
  tips?: string[];
  note?: string;
};

type Stage = "loading" | "needs-profile" | "name" | "birth" | "chat" | "book";

const ASK_WHO = "Who are we getting ready for?";

function tomorrowAt11() {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(11, 0, 0, 0);
  return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function wallTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return localWallDateTime(date, `${pad(date.getHours())}:${pad(date.getMinutes())}`);
}

export default function PrepPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [themName, setThemName] = useState("");
  const [result, setResult] = useState<PrepResult | null>(null);
  const [slotStart, setSlotStart] = useState("");
  const [withMeet, setWithMeet] = useState(true);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const say = (...next: Message[]) => setMsgs((prev) => [...prev, ...next]);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        const p = normalizeProfile(d.profile);
        if (!isProfileComplete(p)) {
          setStage("needs-profile");
          return;
        }
        setProfile(p);
        setMsgs([{ role: "guide", text: `Hey ${p.displayName}! ${ASK_WHO}` }]);
        setStage("name");
      })
      .catch(() => setStage("needs-profile"));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: gentleScroll(), block: "end" });
  }, [msgs, stage, busy]);

  function startOver() {
    setResult(null);
    setThemName("");
    say({ role: "guide", text: ASK_WHO });
    setStage("name");
  }

  function askBirth(name: string) {
    setThemName(name);
    say({ role: "you", text: name }, { role: "guide", text: `When was ${name} born?` });
    setStage("birth");
  }

  async function compare(birthDate: string) {
    if (!profile) return;
    say({ role: "you", text: birthDate });
    setBusy(true);
    try {
      const res = await fetch("/api/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          you: { name: profile.displayName, birthDate: profile.birthDate },
          them: { name: themName, birthDate },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        say({ role: "guide", text: "That date didn't work. Could you try it again?" });
        return;
      }
      const prep = data as PrepResult;
      setResult(prep);
      setSlotStart(tomorrowAt11());
      say({
        role: "guide",
        text: `Love it. ${prep.them.name}'s energy: ${prep.them.theme.toLowerCase()}. Yours: ${prep.you.theme.toLowerCase()}. Here's how to click:`,
        tips: prep.tips.slice(0, -1),
        note: `Life Path ${prep.them.lifePath} and ${prep.you.lifePath}. ${prep.disclaimer}`,
      });
      setStage("chat");
    } catch {
      say({ role: "guide", text: "I couldn't reach Satro just now. Try that again?" });
    } finally {
      setBusy(false);
    }
  }

  async function ask(question: string) {
    say({ role: "you", text: question });
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history: msgs.map((m) => ({
            role: m.role === "you" ? "user" : "assistant",
            content: m.text,
          })),
          about: result
            ? `Preparing to meet ${result.them.name}. Their energy: ${result.them.theme}. Tips given: ${result.tips.slice(0, -1).join(" ")}`
            : "",
        }),
      });
      const data = await res.json();
      const sources = data.sources?.length ? `Sources: ${data.sources.join(", ")}. ` : "";
      say({ role: "guide", text: data.answer, note: `${sources}${data.disclaimer || ""}` });
    } catch {
      say({ role: "guide", text: "I couldn't reach Satro just now. Try that again?" });
    } finally {
      setBusy(false);
    }
  }

  async function book() {
    if (!result || !slotStart) return;
    setBusy(true);
    try {
      const start = new Date(slotStart);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: `Satro Prep · ${result.you.name} × ${result.them.name}`,
          description: result.tips.slice(0, -1).join("\n"),
          start: wallTime(start),
          end: wallTime(end),
          withMeet,
          timeZone: browserTimeZone(),
        }),
      });
      const data = await res.json();
      if (data.mode === "google") {
        const link = data.event?.hangoutLink;
        say({ role: "guide", text: `Done, you're all set!${link ? ` Meet link: ${link}` : ""}` });
      } else {
        say({
          role: "guide",
          text: data.needsReauth
            ? data.message
            : "Saved here with a Mock badge. Connect Google to add it to your real calendar.",
        });
      }
      setStage("chat");
    } catch {
      say({ role: "guide", text: "I couldn't book that just now. Try again?" });
    } finally {
      setBusy(false);
    }
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    if (stage === "name") askBirth(text);
    else if (stage === "birth") compare(text);
    else ask(text);
  }

  if (stage === "needs-profile") {
    return (
      <div className="satro-card mx-auto max-w-lg space-y-3 text-center satro-fade-in">
        <h1 className="satro-page-title">Prep</h1>
        <p className="satro-page-sub">
          Add your name and birth date first, and your guide can compare you
          with anyone you&apos;re meeting.
        </p>
        <Link href="/profile" className="satro-btn-primary inline-flex">
          Open profile
        </Link>
      </div>
    );
  }

  const askingDate = stage === "birth";

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h1 className="satro-page-title">Prep</h1>

      <div className="satro-card flex h-[calc(100dvh-17rem)] min-h-[420px] flex-col gap-3 p-4">
        <div className="flex-1 space-y-2.5 overflow-y-auto" aria-live="polite">
          {stage === "loading" && <div className="satro-skeleton h-10 w-2/3 rounded-2xl" />}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`max-w-[88%] rounded-[18px] px-3.5 py-2.5 text-[15px] leading-snug ${
                m.role === "you"
                  ? "ml-auto bg-cosmic text-on-cosmic"
                  : "bg-orbit-muted/70 text-space"
              }`}
            >
              {m.text}
              {m.tips && (
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
                  {m.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              )}
              {m.note && <p className="mt-2 text-[11px] text-space/70">{m.note}</p>}
            </div>
          ))}
          {busy && (
            <div className="w-fit rounded-[18px] bg-orbit-muted/70 px-3.5 py-2.5 text-sm text-space/70">
              Thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {stage === "chat" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="satro-btn-ghost satro-btn-sm"
              onClick={() => {
                say(
                  { role: "you", text: "Book a time" },
                  { role: "guide", text: "Great! When works for you?" }
                );
                setStage("book");
              }}
            >
              Book a time
            </button>
            <button type="button" className="satro-btn-ghost satro-btn-sm" onClick={startOver}>
              Prep someone else
            </button>
          </div>
        )}

        {stage === "book" ? (
          <div className="space-y-2 border-t border-space/[0.08] pt-3">
            <label className="satro-label">
              Date and time
              <input
                className="satro-input mt-1"
                type="datetime-local"
                value={slotStart}
                onChange={(e) => setSlotStart(e.target.value)}
              />
            </label>
            <label className="flex min-h-11 items-center justify-between gap-3 text-[15px] text-space">
              Add Google Meet link
              <input
                type="checkbox"
                checked={withMeet}
                onChange={(e) => setWithMeet(e.target.checked)}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="satro-btn-ghost flex-1"
                onClick={() => setStage("chat")}
              >
                Not now
              </button>
              <button
                type="button"
                className="satro-btn-primary flex-1"
                onClick={book}
                disabled={busy}
              >
                Book it
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={send} className="flex gap-2 border-t border-space/[0.08] pt-3">
            <input
              key={stage}
              className="satro-input"
              type={askingDate ? "date" : "text"}
              aria-label={askingDate ? "Their birth date" : "Your message"}
              placeholder={stage === "name" ? "Their name" : "Ask me anything…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={stage === "loading"}
            />
            <button
              type="submit"
              className="satro-btn-primary shrink-0"
              disabled={busy || !input.trim()}
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
