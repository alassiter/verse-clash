import { describe, expect, it } from "vitest";
import { createGame, flushAsync, host, lee, priya, sam, submitUntilDone } from "./harness";

describe("hybrid scoring across multiple teams", () => {
  it("computes word points and placement per team and rolls up into cumulative totals", async () => {
    const { commands, advanceTime } = createGame();
    const created = await commands.createRoom(host, { displayName: "Alex" });
    const roomCode = created.roomCode;
    await commands.joinRoom(priya, { code: roomCode, displayName: "Priya" });
    await commands.joinRoom(sam, { code: roomCode, displayName: "Sam" });
    await commands.joinRoom(lee, { code: roomCode, displayName: "Lee" });

    const teams = (await commands.getHostView(host, roomCode)).teams;
    const goblin = teams.find((team) => team.id === "goblin")!;
    const waffle = teams.find((team) => team.id === "waffle")!;
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);
    await commands.movePlayer(host, roomCode, sam.id, waffle.id);
    await commands.movePlayer(host, roomCode, lee.id, waffle.id);

    await commands.startRound(host, roomCode);
    advanceTime(12_001);
    await commands.heartbeat(host, roomCode);

    for (const actor of [priya, sam, lee]) {
      await submitUntilDone(commands, actor, roomCode);
    }
    await flushAsync();
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("reveal");

    for (let i = 0; i < 80; i += 1) {
      if ((await commands.getPlayerView(priya, roomCode)).phase === "voting") break;
      advanceTime(4_001);
      await commands.heartbeat(host, roomCode);
    }
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("voting");

    await commands.vote(priya, roomCode, goblin.id);
    advanceTime(30_001);
    await commands.heartbeat(host, roomCode);

    const standings = (await commands.getPlayerView(priya, roomCode)).standings!;
    expect(standings).toHaveLength(4);
    const goblinRow = standings.find((row) => row.teamId === goblin.id)!;
    const waffleRow = standings.find((row) => row.teamId === waffle.id)!;

    expect(goblinRow.lastRound?.wordPoints).toBeGreaterThan(0);
    expect(waffleRow.lastRound?.wordPoints).toBeGreaterThan(0);

    // Red got the only crowd vote.
    expect(goblinRow.lastRound?.crowdFavoriteBonus).toBeGreaterThan(0);
    expect(waffleRow.lastRound?.crowdFavoriteBonus).toBe(0);

    // Exactly one team at each placement rung.
    const placements = [goblinRow.lastRound?.placementPoints, waffleRow.lastRound?.placementPoints]
      .slice()
      .sort((a, b) => (b ?? 0) - (a ?? 0));
    expect(placements).toEqual([10, 7]);

    // Cumulative total after round 1 equals that round's total (no prior rounds).
    expect(goblinRow.totalScore).toBe(goblinRow.lastRound?.totalRoundScore);
    expect(waffleRow.totalScore).toBe(waffleRow.lastRound?.totalRoundScore);

    // Untouched teams still appear with zeroed cumulative stats and no round data.
    const untouched = standings.find((row) => row.teamId !== goblin.id && row.teamId !== waffle.id)!;
    expect(untouched.totalScore).toBe(0);
    expect(untouched.roundsWon).toBe(0);
    expect(untouched.lastRound).toBeUndefined();
  });
});
