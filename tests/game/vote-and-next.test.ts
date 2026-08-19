import { describe, expect, it } from "vitest";
import { createRoomCommands, RoomError } from "@/lib/game";
import { createGame, host, openLobby, priya, reachVoting, sam } from "./harness";

describe("vote and next round", () => {
  it("allows one Crowd Favorite vote per player and increments the winning team when the clock ends", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await reachVoting(commands, advanceTime);
    const goblinId = (await commands.getPlayerView(priya, roomCode)).team!.id;
    await commands.vote(priya, roomCode, goblinId);
    await commands.vote(priya, roomCode, goblinId);
    await commands.vote(sam, roomCode, goblinId);
    advanceTime(30_001);
    await commands.heartbeat(host, roomCode);
    const standings = await commands.getPlayerView(priya, roomCode);
    expect(standings.phase).toBe("standings");
    expect(standings.standings?.find((row) => row.teamId === goblinId)?.wins).toBe(1);
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
    expect(next.prompt?.text).toBe("Give a heartfelt toast to a beloved piece of office equipment.");
    expect(next.team?.id).toBe(teamId);
    await commands.endGame(host, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("ended");
  });

  it("lets the host restart a finished game in the same room", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await reachVoting(commands, advanceTime);
    await commands.endGame(host, roomCode);
    await commands.restartGame(host, roomCode);
    const gathering = await commands.getPlayerView(priya, roomCode);
    expect(gathering.phase).toBe("gathering");
    expect(gathering.roomCode).toBe(roomCode);
    expect(gathering.team).toBeNull();
    expect(gathering.isReady).toBe(false);
  });

  it("keeps restart host-only and only allows it after ending", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await reachVoting(commands, advanceTime);
    await expect(commands.restartGame(host, roomCode)).rejects.toBeInstanceOf(RoomError);
    await commands.endGame(host, roomCode);
    await expect(commands.restartGame(priya, roomCode)).rejects.toBeInstanceOf(RoomError);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("ended");
  });

  it("lets the host end a round and count whatever votes exist", async () => {
    const { commands } = createGame();
    const roomCode = await openLobby(commands);
    await commands.startRound(host, roomCode);
    await commands.endRound(host, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("standings");
  });

  it("ends the game automatically once the third round finishes", () => {
    const { commands } = createGame();
    const roomCode = openLobby(commands);

    commands.startRound(host, roomCode); // round 1
    commands.endRound(host, roomCode);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("standings");

    commands.startNextRound(host, roomCode); // round 2
    commands.endRound(host, roomCode);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("standings");

    commands.startNextRound(host, roomCode); // round 3 — the final round
    commands.endRound(host, roomCode);
    const final = commands.getPlayerView(priya, roomCode);
    expect(final.phase).toBe("ended");
    expect(final.standings).toBeDefined();

    expect(() => commands.startNextRound(host, roomCode)).toThrow();
  });
});
