import { describe, expect, it } from "vitest";
import { createGame, host, openLobby, priya, reachVoting, sam } from "./harness";

describe("vote and next round", () => {
  it("allows one Crowd Favorite vote per player and increments the winning team when the clock ends", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await reachVoting(commands, advanceTime);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("voting");
    const goblinId = commands.getPlayerView(priya, roomCode).team!.id;
    commands.vote(priya, roomCode, goblinId);
    commands.vote(priya, roomCode, goblinId);
    commands.vote(sam, roomCode, goblinId);
    advanceTime(30_001);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("voting");
    commands.heartbeat(host, roomCode);
    const standings = commands.getPlayerView(priya, roomCode);
    expect(standings.phase).toBe("standings");
    expect(standings.standings?.find((row) => row.teamId === goblinId)?.roundsWon).toBe(1);
    expect(standings.individualScores).toBeUndefined();
  });

  it("starts a different next prompt (never immediately repeating) or ends the game", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await reachVoting(commands, advanceTime);
    const firstPromptText = commands.getPlayerView(priya, roomCode).prompt?.text;
    advanceTime(30_001);
    commands.heartbeat(host, roomCode);
    const teamId = commands.getPlayerView(priya, roomCode).team?.id;
    commands.startNextRound(host, roomCode);
    const next = commands.getPlayerView(priya, roomCode);
    expect(next.phase).toBe("prompt_reveal");
    expect(next.prompt?.text).toBeTruthy();
    expect(next.prompt?.text).not.toBe(firstPromptText);
    expect(next.team?.id).toBe(teamId);
    commands.endGame(host, roomCode);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("ended");
  });

  it("lets the host end this round and count whatever votes exist", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = openLobby(commands);
    commands.startRound(host, roomCode);
    commands.endRound(host, roomCode);
    const early = commands.getPlayerView(priya, roomCode);
    expect(early.phase).toBe("standings");
    expect(early.standings?.every((row) => row.roundsWon === 0)).toBe(true);

    commands.startNextRound(host, roomCode);
    const goblin = commands
      .getHostView(host, roomCode)
      .teams.find((team) => team.id === "goblin");
    if (!goblin) throw new Error("missing Red team");
    commands.movePlayer(host, roomCode, priya.id, goblin.id);
    commands.endRound(host, roomCode);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("standings");
  });

  it("ends the game automatically once the third round finishes with a clear leader", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await reachVoting(commands, advanceTime);
    const goblinId = commands.getPlayerView(priya, roomCode).team!.id;
    commands.vote(priya, roomCode, goblinId);
    advanceTime(30_001);
    commands.heartbeat(host, roomCode); // round 1 — goblin picks up a Crowd Favorite bonus

    commands.startNextRound(host, roomCode); // round 2
    commands.endRound(host, roomCode);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("standings");

    commands.startNextRound(host, roomCode); // round 3 — the final round
    commands.endRound(host, roomCode);
    const final = commands.getPlayerView(priya, roomCode);
    expect(final.phase).toBe("ended");
    expect(final.standings).toBeDefined();
    expect(final.winner?.teamNames).toEqual([final.team!.name]);

    expect(() => commands.startNextRound(host, roomCode)).toThrow();
  });

  it("keeps playing sudden-death rounds instead of ending on a tie after round 3", () => {
    const { commands } = createGame();
    const roomCode = openLobby(commands);

    commands.startRound(host, roomCode); // round 1
    commands.endRound(host, roomCode);
    commands.startNextRound(host, roomCode); // round 2
    commands.endRound(host, roomCode);
    commands.startNextRound(host, roomCode); // round 3 — regulation ends, still tied 0-0
    commands.endRound(host, roomCode);

    const afterRoundThree = commands.getPlayerView(priya, roomCode);
    expect(afterRoundThree.phase).toBe("standings");
    expect(afterRoundThree.isTiebreaker).toBe(false);

    commands.startNextRound(host, roomCode); // round 4 — sudden death, since nobody broke the tie
    const tiebreakerRound = commands.getPlayerView(priya, roomCode);
    expect(tiebreakerRound.phase).toBe("prompt_reveal");
    commands.endRound(host, roomCode);

    const afterTiebreaker = commands.getPlayerView(priya, roomCode);
    expect(afterTiebreaker.phase).toBe("standings");
    expect(afterTiebreaker.isTiebreaker).toBe(true);

    // The tie is never going to break on its own here (nobody is scoring), so
    // the host always has the option to call it manually.
    commands.endGame(host, roomCode);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("ended");
  });
});
