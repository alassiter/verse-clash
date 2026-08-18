import { describe, expect, it } from "vitest";
import { createGame, host, openLobby, priya, sam } from "./harness";

function reachVoting(commands: ReturnType<typeof createGame>["commands"]) {
  const roomCode = openLobby(commands);
  commands.startRound(host, roomCode);
  commands.forceAdvance(host, roomCode);
  commands.forceAdvance(host, roomCode);
  for (let i = 0; i < 40; i += 1) {
    const phase = commands.getPlayerView(priya, roomCode).phase;
    if (phase === "voting") break;
    commands.advanceReveal(host, roomCode);
  }
  return roomCode;
}

describe("vote and next round", () => {
  it("allows one Crowd Favorite vote per player and increments the winning team", () => {
    const { commands } = createGame();
    const roomCode = reachVoting(commands);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("voting");
    const goblinId = commands.getPlayerView(priya, roomCode).team!.id;
    commands.vote(priya, roomCode, goblinId);
    commands.vote(priya, roomCode, goblinId);
    commands.vote(sam, roomCode, goblinId);
    commands.closeVoting(host, roomCode);
    const standings = commands.getPlayerView(priya, roomCode);
    expect(standings.phase).toBe("standings");
    expect(standings.standings?.find((row) => row.teamId === goblinId)?.wins).toBe(1);
    expect(standings.individualScores).toBeUndefined();
  });

  it("starts the next authored prompt or ends the game", () => {
    const { commands } = createGame();
    const roomCode = reachVoting(commands);
    commands.closeVoting(host, roomCode);
    commands.startNextRound(host, roomCode);
    const next = commands.getPlayerView(priya, roomCode);
    expect(next.phase).toBe("prompt_reveal");
    expect(next.prompt?.text).toBe(
      "Give a heartfelt toast to a beloved piece of office equipment.",
    );
    commands.endGame(host, roomCode);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("ended");
  });
});
