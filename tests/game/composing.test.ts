import { describe, expect, it } from "vitest";
import {
  createGame,
  flushAsync,
  host,
  playThroughSelection,
  priya,
} from "./harness";
import type { AiComposer, ComposeJudgeResult } from "@/lib/game/types";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("composing phase", () => {
  it("applies the AI composer's output once it resolves", async () => {
    const ai: AiComposer = {
      async composeAndJudge(input) {
        const result: ComposeJudgeResult = {
          requestId: input.requestId,
          compositions: input.teams.map((team) => ({
            teamId: team.teamId,
            segments: [{ type: "static", text: "AI SAYS HELLO" }],
            source: "ai",
          })),
        };
        return result;
      },
    };
    const { commands, advanceTime } = createGame({ ai });
    const roomCode = await playThroughSelection(commands, advanceTime);
    const view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("reveal");
    expect(
      view.reveal?.composition.some(
        (segment) => segment.type === "static" && segment.text === "AI SAYS HELLO",
      ),
    ).toBe(true);
  });

  it("falls back to the deterministic composer when the AI call rejects", async () => {
    const ai: AiComposer = {
      async composeAndJudge() {
        throw new Error("upstream failure");
      },
    };
    const { commands, advanceTime } = createGame({ ai });
    const roomCode = await playThroughSelection(commands, advanceTime);
    const view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("reveal");
    expect(
      view.reveal?.composition.some(
        (segment) =>
          segment.type === "contribution" &&
          segment.displayName === "House" &&
          segment.text === "continue",
      ),
    ).toBe(true);
  });

  it("falls back to the deterministic composer when the AI call never resolves before the ceiling", async () => {
    const ai: AiComposer = {
      composeAndJudge: () => new Promise(() => {}),
    };
    const { commands, advanceTime } = createGame({ ai });
    const roomCode = await playThroughSelection(commands, advanceTime);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("composing");
    advanceTime(20_001);
    await commands.heartbeat(host, roomCode);
    const view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("reveal");
    expect(
      view.reveal?.composition.some(
        (segment) =>
          segment.type === "contribution" &&
          segment.displayName === "House" &&
          segment.text === "continue",
      ),
    ).toBe(true);
  });

  it("shows the team its own words, in the exact order sent to the AI, while composing", async () => {
    let sentFills: Array<{ text: string; displayName: string }> = [];
    const ai: AiComposer = {
      composeAndJudge: (input) => {
        const team = input.teams.find((entry) => entry.teamId === "goblin")!;
        sentFills = team.fills.map((fill) => ({ text: fill.text, displayName: fill.displayName }));
        return new Promise(() => {});
      },
    };
    const { commands, advanceTime } = createGame({ ai });
    const roomCode = await playThroughSelection(commands, advanceTime);
    const view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("composing");
    expect(view.composingWords).toEqual(sentFills);
    expect(view.composingWords?.map((word) => word.displayName)).toEqual(
      expect.arrayContaining(["Priya", "Sam"]),
    );
  });

  it("discards a stale AI resolution that arrives after the host force-ends the round", async () => {
    const pending = deferred<ComposeJudgeResult>();
    const ai: AiComposer = {
      composeAndJudge: () => pending.promise,
    };
    const { commands, advanceTime } = createGame({ ai });
    const roomCode = await playThroughSelection(commands, advanceTime);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("composing");

    await commands.endRound(host, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("standings");

    pending.resolve({
      requestId: "stale",
      compositions: [{ teamId: "goblin", segments: [], source: "ai" }],
    });
    await flushAsync();

    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("standings");
  });
});
