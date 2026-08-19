import { describe, expect, it } from "vitest";
import { createGame, host, openLobby, priya, reachVoting, sam } from "./harness";

describe("vote and next round", () => {
  it("allows one Crowd Favorite vote per player and increments the winning team when the clock ends", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await reachVoting(commands, advanceTime);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("voting");
    const goblinId = (await commands.getPlayerView(priya, roomCode)).team!.id;
    await commands.vote(priya, roomCode, goblinId);
    await commands.vote(priya, roomCode, goblinId);
    await commands.vote(sam, roomCode, goblinId);
    advanceTime(30_001);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("voting");
    await commands.heartbeat(host, roomCode);
    const standings = await commands.getPlayerView(priya, roomCode);
    expect(standings.phase).toBe("standings");
    expect(standings.standings?.find((row) => row.teamId === goblinId)?.wins).toBe(1);
    expect(standings.individualScores).toBeUndefined();
  });

  it("starts the next authored prompt or ends the game", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await reachVoting(commands, advanceTime);
    advanceTime(30_001);
    await commands.heartbeat(host, roomCode);
    const teamId = (await commands.getPlayerView(priya, roomCode)).team?.id;
    await commands.startNextRound(host, roomCode);
    const next = await commands.getPlayerView(priya, roomCode);
    expect(next.phase).toBe("prompt_reveal");
    expect(next.prompt?.text).toBe(
      "Give a heartfelt toast to a beloved piece of office equipment.",
    );
    expect(next.team?.id).toBe(teamId);
    await commands.endGame(host, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("ended");
  });

  it("lets the host end this round and count whatever votes exist", async () => {
    const { commands } = createGame();
    const roomCode = await openLobby(commands);
    await commands.startRound(host, roomCode);
    await commands.endRound(host, roomCode);
    const early = await commands.getPlayerView(priya, roomCode);
    expect(early.phase).toBe("standings");
    expect(early.standings?.every((row) => row.wins === 0)).toBe(true);

    await commands.startNextRound(host, roomCode);
    const goblin = (await commands.getHostView(host, roomCode)).teams.find(
      (team) => team.id === "goblin",
    );
    if (!goblin) throw new Error("missing Goblin");
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);
    await commands.endRound(host, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("standings");
  });
});
