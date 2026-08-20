import { describe, expect, it } from "vitest";
import {
  createGame,
  enterSelecting,
  flushAsync,
  host,
  priya,
  sam,
  submitUntilDone,
} from "./harness";
import type { AiComposer, ComposeJudgeInput } from "@/lib/game/types";

function recordingComposer() {
  const captured: ComposeJudgeInput["teams"] = [];
  const ai: AiComposer = {
    async composeAndJudge(input) {
      captured.splice(0, captured.length, ...input.teams);
      return {
        requestId: input.requestId,
        compositions: input.teams.map((team) => ({
          teamId: team.teamId,
          segments: [{ type: "static", text: "ok" }],
          source: "ai",
        })),
      };
    },
  };
  return { ai, captured };
}

describe("solo team fill floor", () => {
  it("queues a solo player for 11 Fills instead of auto-filling leftover Slots", async () => {
    const { ai, captured } = recordingComposer();
    const { commands, advanceTime } = createGame({ ai });
    const created = await commands.createRoom(host, { displayName: "Alex" });
    const roomCode = created.roomCode;
    await commands.joinRoom(priya, { code: roomCode, displayName: "Priya" });
    const goblin = (await commands.getHostView(host, roomCode)).teams.find((t) => t.id === "goblin")!;
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);

    await enterSelecting(commands, advanceTime, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).soloAutoFill).toBeUndefined();

    const first = (await commands.getPlayerView(priya, roomCode)).selection!;
    await commands.submitChoice(priya, roomCode, first.options[0].id);
    const next = await commands.getPlayerView(priya, roomCode);
    expect(next.phase).toBe("selecting");
    expect(next.selection?.submitted).toBe(false);

    await submitUntilDone(commands, priya, roomCode);
    await flushAsync();

    const goblinFills = captured.find((team) => team.teamId === "goblin")?.fills;
    expect(goblinFills).toHaveLength(11);
    expect(goblinFills?.every((fill) => fill.displayName === "Priya")).toBe(true);
  });

  it("does not insert house auto-fill when a team has more than one active player", async () => {
    const { ai, captured } = recordingComposer();
    const { commands, advanceTime } = createGame({ ai });
    const created = await commands.createRoom(host, { displayName: "Alex" });
    const roomCode = created.roomCode;
    await commands.joinRoom(priya, { code: roomCode, displayName: "Priya" });
    await commands.joinRoom(sam, { code: roomCode, displayName: "Sam" });
    const goblin = (await commands.getHostView(host, roomCode)).teams.find((t) => t.id === "goblin")!;
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);
    await commands.movePlayer(host, roomCode, sam.id, goblin.id);

    await enterSelecting(commands, advanceTime, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).soloAutoFill).toBeUndefined();

    await submitUntilDone(commands, priya, roomCode);
    await submitUntilDone(commands, sam, roomCode);
    await flushAsync();

    const goblinFills = captured.find((team) => team.teamId === "goblin")?.fills;
    expect(goblinFills).toHaveLength(11);
    expect(goblinFills?.some((fill) => fill.displayName === "Auto-fill")).toBe(false);
    expect(goblinFills?.some((fill) => fill.displayName === "House")).toBe(false);
  });

  it("doubles the solo queue to 22 Fills under double_trouble", async () => {
    const { ai, captured } = recordingComposer();
    const { commands, advanceTime } = createGame({ ai });
    const created = await commands.createRoom(host, { displayName: "Alex" });
    const roomCode = created.roomCode;
    await commands.joinRoom(priya, { code: roomCode, displayName: "Priya" });
    const goblin = (await commands.getHostView(host, roomCode)).teams.find((t) => t.id === "goblin")!;
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);

    await commands.startRound(host, roomCode);
    await commands.endRound(host, roomCode);
    await commands.startNextRound(host, roomCode);
    await commands.endRound(host, roomCode);
    await commands.startNextRound(host, roomCode);

    advanceTime(12_001);
    await commands.heartbeat(host, roomCode);
    let view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("selecting");
    expect(view.chaosCard?.id).toBe("double_trouble");
    expect(view.soloAutoFill).toBeUndefined();

    await submitUntilDone(commands, priya, roomCode);
    await flushAsync();

    const goblinFills = captured.find((team) => team.teamId === "goblin")?.fills;
    expect(goblinFills).toHaveLength(22);
    expect(goblinFills?.every((fill) => fill.displayName === "Priya")).toBe(true);
  });
});
