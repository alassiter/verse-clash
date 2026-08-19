import { describe, expect, it } from "vitest";
import {
  createGame,
  enterSelecting,
  flushAsync,
  host,
  jo,
  lee,
  openLobby,
  priya,
  sam,
  submitUntilDone,
} from "./harness";
import type { AiComposer, ComposeJudgeInput } from "@/lib/game/types";
import type { RoomCommands } from "@/lib/game";

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

async function seatOnGoblin(
  commands: RoomCommands,
  roomCode: string,
  playerIds: string[],
) {
  const goblin = (await commands.getHostView(host, roomCode)).teams.find(
    (team) => team.id === "goblin",
  );
  if (!goblin) throw new Error("missing Goblin");
  for (const playerId of playerIds) {
    await commands.movePlayer(host, roomCode, playerId, goblin.id);
  }
}

describe("fill floor", () => {
  it("deals a 4-person Team toward 11 Fills as a personal queue", async () => {
    const { ai, captured } = recordingComposer();
    const { commands, advanceTime } = createGame({ ai });
    const roomCode = await openLobby(commands);
    await commands.joinRoom(jo, { code: roomCode, displayName: "Jo" });
    await seatOnGoblin(commands, roomCode, [priya.id, sam.id, lee.id, jo.id]);
    await enterSelecting(commands, advanceTime, roomCode);

    const firstHand = (await commands.getPlayerView(priya, roomCode)).selection;
    expect(firstHand?.options).toHaveLength(5);
    expect(firstHand?.submitted).toBe(false);

    await commands.submitChoice(priya, roomCode, firstHand!.options[0].id);
    const secondHand = await commands.getPlayerView(priya, roomCode);
    expect(secondHand.phase).toBe("selecting");
    expect(secondHand.selection?.submitted).toBe(false);
    expect(secondHand.selection?.options).toHaveLength(5);
    expect(secondHand.selection?.options[0].id).not.toBe(firstHand!.options[0].id);

    await submitUntilDone(commands, priya, roomCode);
    await submitUntilDone(commands, sam, roomCode);
    await submitUntilDone(commands, lee, roomCode);
    await submitUntilDone(commands, jo, roomCode);
    await flushAsync();

    const goblin = captured.find((team) => team.teamId === "goblin");
    expect(goblin?.fills).toHaveLength(11);
  });

  it("deals a 12-person Team one Fill each", async () => {
    const { ai, captured } = recordingComposer();
    const { commands, advanceTime } = createGame({ ai });
    const created = await commands.createRoom(host, { displayName: "Alex" });
    const roomCode = created.roomCode;
    const players = Array.from({ length: 12 }, (_, index) => ({
      id: `player-${index}`,
      displayName: `P${index}`,
    }));
    for (const player of players) {
      await commands.joinRoom(player, { code: roomCode, displayName: player.displayName });
    }
    await seatOnGoblin(
      commands,
      roomCode,
      players.map((player) => player.id),
    );
    await enterSelecting(commands, advanceTime, roomCode);
    for (const player of players) {
      await submitUntilDone(commands, player, roomCode);
    }
    await flushAsync();

    const goblin = captured.find((team) => team.teamId === "goblin");
    expect(goblin?.fills).toHaveLength(12);
  });

  it("deals Double Trouble toward 22 Fills (or two each if the Team is larger)", async () => {
    const { ai, captured } = recordingComposer();
    const { commands, advanceTime } = createGame({ ai });
    const roomCode = await openLobby(commands);
    await commands.joinRoom(jo, { code: roomCode, displayName: "Jo" });
    await seatOnGoblin(commands, roomCode, [priya.id, sam.id, lee.id, jo.id]);

    await commands.startRound(host, roomCode);
    await commands.endRound(host, roomCode);
    await commands.startNextRound(host, roomCode);
    await commands.endRound(host, roomCode);
    await commands.startNextRound(host, roomCode);

    advanceTime(12_001);
    await commands.heartbeat(host, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).chaosCard?.id).toBe("double_trouble");

    await submitUntilDone(commands, priya, roomCode);
    await submitUntilDone(commands, sam, roomCode);
    await submitUntilDone(commands, lee, roomCode);
    await submitUntilDone(commands, jo, roomCode);
    await flushAsync();

    const goblin = captured.find((team) => team.teamId === "goblin");
    expect(goblin?.fills).toHaveLength(22);
  });

  it("recycles unchosen options into the next hand and never shares a live option text", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await openLobby(commands);
    await commands.joinRoom(jo, { code: roomCode, displayName: "Jo" });
    await seatOnGoblin(commands, roomCode, [priya.id, sam.id, lee.id, jo.id]);
    await enterSelecting(commands, advanceTime, roomCode);

    const priyaFirst = (await commands.getPlayerView(priya, roomCode)).selection!.options;
    const chosen = priyaFirst[0];
    const unchosen = priyaFirst.slice(1).map((option) => option.text);
    const liveTexts = (actor: { id: string }) =>
      commands.getPlayerView(actor, roomCode).then((view) =>
        (view.selection?.options ?? []).map((option) => option.text),
      );

    await commands.submitChoice(priya, roomCode, chosen.id);
    const priyaSecond = (await commands.getPlayerView(priya, roomCode)).selection!.options.map(
      (option) => option.text,
    );
    const samLive = await liveTexts(sam);
    const leeLive = await liveTexts(lee);
    const joLive = await liveTexts(jo);

    expect(priyaSecond).not.toContain(chosen.text);
    expect(priyaSecond.some((text) => unchosen.includes(text))).toBe(true);

    const allLive = [...priyaSecond, ...samLive, ...leeLive, ...joLive];
    expect(new Set(allLive).size).toBe(allLive.length);
  });
});
