import { describe, expect, it } from "vitest";
import { createGame, host, jo, lee, openLobby, priya, sam } from "./harness";
import { RoomError } from "@/lib/game";

describe("seat teams and ready up", () => {
  it("assigns everyone except the host to random teams when the host starts", async () => {
    const { commands } = createGame();
    const created = await commands.createRoom(host, { displayName: "Alex" });
    await commands.joinRoom(priya, { code: created.roomCode, displayName: "Priya" });
    await commands.joinRoom(sam, { code: created.roomCode, displayName: "Sam" });
    await commands.joinRoom(lee, { code: created.roomCode, displayName: "Lee" });
    await commands.joinRoom(jo, { code: created.roomCode, displayName: "Jo" });

    expect((await commands.getPlayerView(priya, created.roomCode)).team).toBeNull();
    await commands.startRound(host, created.roomCode);

    expect((await commands.getHostView(host, created.roomCode)).team).toBeNull();
    const names = (await commands.getHostView(host, created.roomCode)).players
      .filter((player) => !player.isHost)
      .map((player) => `${player.displayName}:${player.teamName}`);
    expect(names).toEqual([
      "Priya:Stapler",
      "Sam:Goblin",
      "Lee:Waffle",
      "Jo:Penguin",
    ]);
    expect((await commands.getPlayerView(priya, created.roomCode)).team?.name).toBe(
      "Stapler",
    );
  });

  it("lets the host shuffle and move a player, but not seat themselves", async () => {
    const { commands } = createGame();
    const roomCode = await openLobby(commands);
    await commands.startRound(host, roomCode);
    await commands.shuffleTeams(host, roomCode);
    const afterShuffle = (await commands.getHostView(host, roomCode)).players;
    expect(
      afterShuffle
        .filter((player) => !player.isHost)
        .every((player) =>
          ["Goblin", "Waffle", "Penguin", "Stapler"].includes(player.teamName ?? ""),
        ),
    ).toBe(true);
    expect(afterShuffle.find((player) => player.isHost)?.teamName).toBeNull();

    const waffle = (await commands.getHostView(host, roomCode)).teams.find(
      (team) => team.name === "Waffle",
    );
    if (!waffle) throw new Error("missing Waffle");
    await commands.movePlayer(host, roomCode, priya.id, waffle.id);
    expect((await commands.getPlayerView(priya, roomCode)).team?.name).toBe("Waffle");

    await expect(commands.movePlayer(host, roomCode, host.id, waffle.id)).rejects.toThrow(
      RoomError,
    );
    expect((await commands.getHostView(host, roomCode)).team).toBeNull();
  });

  it("shows ready state and last-seen, and lets the host start while someone is unready", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await openLobby(commands);
    await commands.setReady(priya, roomCode, true);
    advanceTime(45_000);
    await commands.heartbeat(priya, roomCode);
    const hostView = await commands.getHostView(host, roomCode);
    const priyaRow = hostView.players.find((player) => player.id === priya.id);
    const samRow = hostView.players.find((player) => player.id === sam.id);
    expect(priyaRow?.isReady).toBe(true);
    expect(samRow?.isReady).toBe(false);
    expect(samRow?.disconnected).toBe(true);
    expect(priyaRow?.disconnected).toBe(false);

    await commands.startRound(host, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("prompt_reveal");
  });

  it("lets a late gathering joiner ready without a team, then seats them at start", async () => {
    const { commands } = createGame();
    const roomCode = await openLobby(commands);
    await commands.joinRoom(jo, { code: roomCode, displayName: "Jo" });
    await commands.setReady(jo, roomCode, true);
    const joView = await commands.getPlayerView(jo, roomCode);
    expect(joView.team).toBeNull();
    expect(
      (await commands.getHostView(host, roomCode)).players.find(
        (player) => player.id === jo.id,
      )?.isReady,
    ).toBe(true);
    await commands.startRound(host, roomCode);
    expect((await commands.getPlayerView(jo, roomCode)).team?.name).toBeTruthy();
  });
});
