import { describe, expect, it } from "vitest";
import { createGame, flushAsync, host, lee, openLobby, priya, sam } from "./harness";
import type { RoomCommands } from "@/lib/game";

/**
 * The default harness random (`() => 0.1`) always resolves pickChaosCard to
 * index 0 ("double_trouble"); a constant 0.99 resolves to the last card
 * ("sabotage"). Both are exercised below via that determinism rather than by
 * mocking the card picker directly.
 *
 * seatUnseated auto-seats any player nobody moved onto a team at the start of
 * every round, so `lee` (joined by openLobby but never moved in these tests)
 * always lands on a team too — submit for it like any other seated player.
 */
async function submitAll(commands: RoomCommands, actor: { id: string }, roomCode: string) {
  for (let i = 0; i < 3; i += 1) {
    const selection = (await commands.getPlayerView(actor, roomCode)).selection;
    if (!selection || selection.submitted) return;
    await commands.submitChoice(actor, roomCode, selection.options[0].id);
  }
}

describe("chaos card rotation", () => {
  it("automatically turns every third round into a chaos round with a visible card", async () => {
    const { commands } = createGame();
    const roomCode = await openLobby(commands);
    const goblin = (await commands.getHostView(host, roomCode)).teams.find((team) => team.id === "goblin")!;
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);

    await commands.startRound(host, roomCode); // round 1: straight
    expect((await commands.getPlayerView(priya, roomCode)).chaosCard).toBeUndefined();
    await commands.endRound(host, roomCode);
    await commands.startNextRound(host, roomCode); // round 2: straight
    expect((await commands.getPlayerView(priya, roomCode)).chaosCard).toBeUndefined();
    await commands.endRound(host, roomCode);
    await commands.startNextRound(host, roomCode); // round 3: chaos

    const view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("prompt_reveal");
    expect(view.chaosCard?.id).toBe("double_trouble");
  });

  it("double_trouble deals two words per player and both must be submitted before composing", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await openLobby(commands);
    const goblin = (await commands.getHostView(host, roomCode)).teams.find((team) => team.id === "goblin")!;
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);
    await commands.movePlayer(host, roomCode, sam.id, goblin.id);

    await commands.startRound(host, roomCode);
    await commands.endRound(host, roomCode);
    await commands.startNextRound(host, roomCode);
    await commands.endRound(host, roomCode);
    await commands.startNextRound(host, roomCode); // round 3: double_trouble

    advanceTime(12_001);
    await commands.heartbeat(host, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("selecting");

    const firstOption = (await commands.getPlayerView(priya, roomCode)).selection!.options[0].id;
    await commands.submitChoice(priya, roomCode, firstOption);
    const afterFirst = await commands.getPlayerView(priya, roomCode);
    expect(afterFirst.phase).toBe("selecting");
    expect(afterFirst.selection?.submitted).toBe(false);

    await commands.submitChoice(priya, roomCode, afterFirst.selection!.options[0].id);
    await submitAll(commands, sam, roomCode);
    await submitAll(commands, lee, roomCode); // seatUnseated auto-placed lee onto a team too
    await flushAsync();
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("reveal");
  });
});

describe("sabotage chaos card", () => {
  it("clones a rival team's word into another team's verse and discloses both sides after the round", async () => {
    const { commands, advanceTime } = createGame({ random: () => 0.99 });
    const roomCode = await openLobby(commands);
    const goblin = (await commands.getHostView(host, roomCode)).teams.find((team) => team.id === "goblin")!;
    const waffle = (await commands.getHostView(host, roomCode)).teams.find((team) => team.id === "waffle")!;
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);
    await commands.movePlayer(host, roomCode, sam.id, waffle.id);

    await commands.startRound(host, roomCode);
    await commands.endRound(host, roomCode);
    await commands.startNextRound(host, roomCode);
    await commands.endRound(host, roomCode);
    await commands.startNextRound(host, roomCode); // round 3: sabotage

    expect((await commands.getPlayerView(priya, roomCode)).chaosCard?.id).toBe("sabotage");

    advanceTime(12_001);
    await commands.heartbeat(host, roomCode);
    await submitAll(commands, priya, roomCode);
    await submitAll(commands, sam, roomCode);
    await submitAll(commands, lee, roomCode); // seatUnseated auto-placed lee onto a team too
    await flushAsync();
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("reveal");

    for (let i = 0; i < 40; i += 1) {
      if ((await commands.getPlayerView(priya, roomCode)).phase === "voting") break;
      advanceTime(4_001);
      await commands.heartbeat(host, roomCode);
    }
    advanceTime(30_001);
    await commands.heartbeat(host, roomCode);

    const standings = (await commands.getPlayerView(priya, roomCode)).standings!;
    const flagged = standings.filter((row) => row.lastRound?.sabotage);
    expect(flagged).toHaveLength(2);
    const directions = flagged.map((row) => row.lastRound!.sabotage!.direction).sort();
    expect(directions).toEqual(["received", "sent"]);
  });
});
