import { describe, expect, it } from "vitest";
import { createGame, host, openLobby, priya, reachVoting, sam } from "./harness";

describe("vote and next round", () => {
  it("allows one Crowd Favorite vote per player and increments the winning team when the clock ends", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = reachVoting(commands, advanceTime);
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
    expect(standings.standings?.find((row) => row.teamId === goblinId)?.wins).toBe(1);
    expect(standings.individualScores).toBeUndefined();
  });

  it("starts the next authored prompt or ends the game", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = reachVoting(commands, advanceTime);
    advanceTime(30_001);
    commands.heartbeat(host, roomCode);
    const teamId = commands.getPlayerView(priya, roomCode).team?.id;
    commands.startNextRound(host, roomCode);
    const next = commands.getPlayerView(priya, roomCode);
    expect(next.phase).toBe("prompt_reveal");
    expect(next.prompt?.text).toBe(
      "Give a heartfelt toast to a beloved piece of office equipment.",
    );
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
    expect(early.standings?.every((row) => row.wins === 0)).toBe(true);

    commands.startNextRound(host, roomCode);
    const goblin = commands
      .getHostView(host, roomCode)
      .teams.find((team) => team.id === "goblin");
    if (!goblin) throw new Error("missing Goblin");
    commands.movePlayer(host, roomCode, priya.id, goblin.id);
    commands.endRound(host, roomCode);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("standings");
  });
});
