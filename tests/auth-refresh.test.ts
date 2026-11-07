import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { authOptions } from "../src/lib/auth";
import { isAuthFailure } from "../src/lib/google";

const runJwt = (token: JWT, account: Account | null = null) =>
  authOptions.callbacks!.jwt!({ token, account } as Parameters<
    NonNullable<NonNullable<typeof authOptions.callbacks>["jwt"]>
  >[0]);

const expired: JWT = {
  accessToken: "old",
  refreshToken: "refresh",
  accessTokenExpires: Date.now() - 1,
};

describe("jwt callback", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("stores tokens on first sign-in without logging their values", async () => {
    const token = await runJwt({}, {
      access_token: "access",
      refresh_token: "refresh",
      expires_at: 2_000_000_000,
    } as Account);
    expect(token).toMatchObject({
      accessToken: "access",
      refreshToken: "refresh",
      accessTokenExpires: 2_000_000_000_000,
    });
    expect(console.info).toHaveBeenCalledWith("[satro] Google sign-in", {
      refreshTokenPresent: true,
    });
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("access\"");
  });

  it("warns when Google returns no refresh token", async () => {
    await runJwt({}, { access_token: "access" } as Account);
    expect(console.warn).toHaveBeenCalledWith("[satro] Google sign-in", {
      refreshTokenPresent: false,
    });
  });

  it("does not refresh while the token is valid", async () => {
    const token = { ...expired, accessTokenExpires: Date.now() + 3_600_000 };
    await expect(runJwt(token)).resolves.toEqual(token);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes inside the 60-second margin", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ access_token: "new", expires_in: 3600 }))
    );
    const token = await runJwt({ ...expired, accessTokenExpires: Date.now() + 30_000 });
    expect(token.accessToken).toBe("new");
  });

  it("refreshes when expired and keeps the old refresh token", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ access_token: "new", expires_in: 3600 }))
    );
    const token = await runJwt({ ...expired, error: "RefreshAccessTokenError" });
    expect(token.accessToken).toBe("new");
    expect(token.refreshToken).toBe("refresh");
    expect(token.accessTokenExpires).toBeGreaterThan(Date.now());
    expect(token.error).toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(String(init.body)).toContain("grant_type=refresh_token");
  });

  it("sets error when Google rejects the refresh", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })
    );
    const token = await runJwt(expired);
    expect(token.error).toBe("RefreshAccessTokenError");
  });

  it("sets error when the network fails or no refresh token exists", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    expect((await runJwt(expired)).error).toBe("RefreshAccessTokenError");
    const noRefresh = await runJwt({ ...expired, refreshToken: undefined });
    expect(noRefresh.error).toBe("RefreshAccessTokenError");
  });

  it("exposes the error but never the refresh token on the session", async () => {
    const session = (await authOptions.callbacks!.session!({
      session: { expires: "" } as Session,
      token: { ...expired, error: "RefreshAccessTokenError" },
    } as Parameters<NonNullable<NonNullable<typeof authOptions.callbacks>["session"]>>[0])) as Session;
    expect(session.error).toBe("RefreshAccessTokenError");
    expect(JSON.stringify(session)).not.toContain("refresh\"");
  });
});

describe("auth config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws in production without NEXTAUTH_SECRET, but not during build", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.resetModules();
    await expect(import("../src/lib/auth")).rejects.toThrow("NEXTAUTH_SECRET");

    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.resetModules();
    await expect(import("../src/lib/auth")).resolves.toBeDefined();
  });

  it("requests calendar.readonly and offline access", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.resetModules();
    const { authOptions: options } = await import("../src/lib/auth");
    const provider = options.providers[0] as unknown as {
      options: { authorization: { params: Record<string, string> } };
    };
    const { params } = provider.options.authorization;
    expect(params.scope).toContain("calendar.readonly");
    expect(params.scope).not.toContain("freebusy");
    expect(params.access_type).toBe("offline");
    expect(params.include_granted_scopes).toBe("true");
  });
});

describe("isAuthFailure", () => {
  it.each([
    [{ code: 401 }, true],
    [{ code: "401" }, true],
    [{ code: "ERR_BAD_REQUEST", status: 401 }, true],
    [{ response: { status: 400, data: { error: "invalid_grant" } } }, true],
    [{ code: 403, message: "Insufficient Permission" }, true],
    [{ code: 403, message: "Rate Limit Exceeded" }, false],
    [{ code: 500, message: "Backend Error" }, false],
    [{ code: "ECONNRESET" }, false],
    [null, false],
  ])("%j → %s", (error, expected) => {
    expect(isAuthFailure(error)).toBe(expected);
  });
});
