import { describe, expect, it } from "vitest";
import { createGame, flushAsync, host, lee, priya, sam } from "./harness";

describe("hybrid scoring across multiple teams", () => {
  it("computes word points and placement per team and rolls up into cumulative totals", async () => {
    const { commands, advanceTime } = createGame();
    const created = commands.createRoom(host, { displayName: "Alex" });
    const roomCode = created.roomCode;
    commands.joinRoom(priya, { code: roomCode, displayName: "Priya" });
    commands.joinRoom(sam, { code: roomCode, displayName: "Sam" });
    commands.joinRoom(lee, { code: roomCode, displayName: "Lee" });

    const teams = commands.getHostView(host, roomCode).teams;
    const goblin = teams.find((team) => team.id === "goblin")!;
    const waffle = teams.find((team) => team.id === "waffle")!;
    commands.movePlayer(host, roomCode, priya.id, goblin.id);
    commands.movePlayer(host, roomCode, sam.id, waffle.id);
    commands.movePlayer(host, roomCode, lee.id, waffle.id);

    commands.startRound(host, roomCode);
    advanceTime(12_001);
    commands.heartbeat(host, roomCode);

    for (const actor of [priya, sam, lee]) {
      const optionId = commands.getPlayerView(actor, roomCode).selection!.options[0].id;
      commands.submitChoice(actor, roomCode, optionId);
    }
    await flushAsync();
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("reveal");

    for (let i = 0; i < 40; i += 1) {
      if (commands.getPlayerView(priya, roomCode).phase === "voting") break;
      advanceTime(4_001);
      commands.heartbeat(host, roomCode);
    }
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("voting");

    commands.vote(priya, roomCode, goblin.id);
    advanceTime(30_001);
    commands.heartbeat(host, roomCode);

    const standings = commands.getPlayerView(priya, roomCode).standings!;
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
