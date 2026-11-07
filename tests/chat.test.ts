import { describe, expect, it } from "vitest";
import { answerFromCorpus } from "../src/lib/chat";

describe("answerFromCorpus", () => {
  it("explains Rahu Kaal when asked what it is", () => {
    const { answer, sources } = answerFromCorpus("What is Rahu Kaal?");
    expect(answer).toContain("8 equal parts");
    expect(answer).toContain("Rahu Kaal");
    expect(sources).toEqual([]);
  });

  it("still gives the daily tip for timing questions", () => {
    expect(answerFromCorpus("Best hour today?").answer.length).toBeGreaterThan(10);
  });
});
