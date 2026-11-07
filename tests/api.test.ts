import { afterEach, describe, expect, it, vi } from "vitest";
import { getJson } from "../src/lib/api";

afterEach(() => vi.unstubAllGlobals());

describe("getJson", () => {
  it("returns parsed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"ok":true}')));
    await expect(getJson("/x")).resolves.toEqual({ ok: true });
  });

  it("rejects on an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    await expect(getJson("/x")).rejects.toThrow("500");
  });

  it("rejects when the server can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(getJson("/x")).rejects.toThrow("Failed to fetch");
  });
});
