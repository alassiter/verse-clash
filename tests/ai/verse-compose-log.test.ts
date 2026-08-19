import { describe, expect, it } from "vitest";
import { formatCallFailedReason, formatVerseComposeLog } from "@/lib/ai/verse-compose-log";

describe("formatVerseComposeLog", () => {
  it("formats a Claude Verse with ids only", () => {
    expect(
      formatVerseComposeLog({
        roomCode: "K7PQ",
        roundNumber: 1,
        teamName: "Goblins",
        origin: "claude",
      }),
    ).toBe("[verse-compose] room=K7PQ round=1 team=Goblins origin=claude");
  });

  it("formats a fallback with flavor and reason", () => {
    expect(
      formatVerseComposeLog({
        roomCode: "K7PQ",
        roundNumber: 1,
        teamName: "Sprites",
        origin: "call-failed",
        flavor: "toast",
        reason: "Request timed out",
      }),
    ).toBe(
      "[verse-compose] room=K7PQ round=1 team=Sprites origin=call-failed flavor=toast reason=Request timed out",
    );
  });

  it("packs Anthropic API error fields into one reason", () => {
    expect(
      formatCallFailedReason({
        name: "AuthenticationError",
        status: 401,
        type: "authentication_error",
        requestID: "req_123",
        message: "invalid x-api-key",
      }),
    ).toBe("AuthenticationError 401 authentication_error req=req_123 invalid x-api-key");
  });

  it("uses the exception message when that is all we have", () => {
    expect(formatCallFailedReason(new Error("Request timed out"))).toBe("Request timed out");
  });

  it("omits Claude extras even if they are passed", () => {
    expect(
      formatVerseComposeLog({
        roomCode: "K7PQ",
        roundNumber: 2,
        teamName: "Red",
        origin: "claude",
        flavor: "toast",
        reason: "should not appear",
      }),
    ).toBe("[verse-compose] room=K7PQ round=2 team=Red origin=claude");
  });
});
