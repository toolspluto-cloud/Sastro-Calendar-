import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_DOMAINS,
  isValidTimeZone,
  normalizeProfile,
  profileError,
  toggleDomain,
  type UserProfile,
} from "../src/lib/profile";

const saved = vi.hoisted(() => ({ profile: null as unknown }));
vi.mock("@/lib/store", () => ({
  readProfile: () => saved.profile ?? {},
  writeProfile: (p: unknown) => {
    saved.profile = p;
  },
}));
import { GET, POST } from "../src/app/api/profile/route";

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/profile", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );

describe("toggleDomain", () => {
  it("keeps selection order as priority", () => {
    let list = toggleDomain(["career"], "rest");
    list = toggleDomain(list, "money");
    expect(list).toEqual(["career", "rest", "money"]);
    expect(toggleDomain(list, "career")).toEqual(["rest", "money"]);
  });

  it("never empties the list", () => {
    expect(toggleDomain(["rest"], "rest")).toEqual(["rest"]);
  });

  it("allows all 10", () => {
    const all = ALL_DOMAINS.reduce((acc, d) => (acc.includes(d) ? acc : toggleDomain(acc, d)), ["career"] as UserProfile["preferredDomains"]);
    expect(all).toHaveLength(10);
  });
});

describe("normalizeProfile", () => {
  it("keeps domain order, drops unknown and duplicate domains", () => {
    const p = normalizeProfile({ preferredDomains: ["rest", "nope", "money", "rest"] });
    expect(p.preferredDomains).toEqual(["rest", "money"]);
  });

  it("defaults domains to career and cadence to off", () => {
    expect(normalizeProfile({})).toMatchObject({
      preferredDomains: ["career"],
      notificationCadence: "off",
    });
  });

  it("keeps a real timezone and drops a fake one", () => {
    expect(normalizeProfile({ currentTimeZone: "Asia/Kolkata" }).currentTimeZone).toBe("Asia/Kolkata");
    expect(normalizeProfile({ currentTimeZone: "Mars/Base" }).currentTimeZone).toBeUndefined();
    expect(isValidTimeZone("Mars/Base")).toBe(false);
  });

  it("accepts the legacy name key", () => {
    expect(normalizeProfile({ name: "Asha" }).displayName).toBe("Asha");
  });
});

describe("profileError", () => {
  const withDate = (birthDate: string) =>
    profileError(normalizeProfile({ displayName: "Asha", birthDate }));

  it("requires a name and birth date", () => {
    expect(profileError(normalizeProfile({ birthDate: "1991-03-14" }))).toBe(
      "displayName and birthDate are required"
    );
    expect(profileError(normalizeProfile({ displayName: "Asha" }))).toBe(
      "displayName and birthDate are required"
    );
  });

  it("accepts a real date", () => {
    expect(withDate("1991-03-14")).toBeNull();
    expect(withDate("2000-02-29")).toBeNull();
  });

  it.each(["1991-02-30", "2001-02-29", "not-a-date", "1991-13-01", "2999-01-01", "1800-01-01"])(
    "rejects %s",
    (date) => {
      expect(withDate(date)).toMatch(/real birth date/);
    }
  );
});

describe("/api/profile", () => {
  beforeEach(() => {
    saved.profile = null;
  });

  it("returns 400 without a name or birth date, and saves nothing", async () => {
    const res = await post({ displayName: "Asha" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("displayName and birthDate are required");
    expect(saved.profile).toBeNull();
  });

  it("returns 400 for a date the engine couldn't use", async () => {
    expect((await post({ displayName: "Asha", birthDate: "banana" })).status).toBe(400);
    expect(saved.profile).toBeNull();
  });

  it("round-trips the full profile with domain order intact", async () => {
    const res = await post({
      displayName: "Asha",
      birthDate: "1991-03-14",
      currentTimeZone: "Asia/Kolkata",
      preferredDomains: ["rest", "money", "career"],
      notificationCadence: "daily",
    });
    expect(await res.json()).toMatchObject({ saved: true, complete: true });
    const { profile, complete } = await (await GET()).json();
    expect(complete).toBe(true);
    expect(profile).toMatchObject({
      preferredDomains: ["rest", "money", "career"],
      currentTimeZone: "Asia/Kolkata",
      notificationCadence: "daily",
    });
  });
});
