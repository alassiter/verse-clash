import { describe, expect, it } from "vitest";
import { createGame, host, jo, lee, openLobby, priya, sam } from "./harness";

describe("seat teams and ready up", () => {
  it("auto-balances joiners across Goblin, Waffle, Penguin, and Stapler", () => {
    const { commands } = createGame();
    const created = commands.createRoom(host, { displayName: "Alex" });
    commands.joinRoom(priya, { code: created.roomCode, displayName: "Priya" });
    commands.joinRoom(sam, { code: created.roomCode, displayName: "Sam" });
    commands.joinRoom(lee, { code: created.roomCode, displayName: "Lee" });
    commands.joinRoom(jo, { code: created.roomCode, displayName: "Jo" });

    const view = commands.getPlayerView(priya, created.roomCode);
    expect(view.team?.name).toBe("Goblin");
    expect(view.team?.teammates.map((mate) => mate.displayName)).toEqual([
      "Priya",
    ]);
    const names = commands
      .getHostView(host, created.roomCode)
      .players.filter((player) => !player.isHost)
      .map((player) => `${player.displayName}:${player.teamName}`);
    expect(names).toEqual([
      "Priya:Goblin",
      "Sam:Waffle",
      "Lee:Penguin",
      "Jo:Stapler",
    ]);
  });

  it("lets the host shuffle and move a player, including seating or unseating themselves", () => {
    const { commands } = createGame();
    const roomCode = openLobby(commands);
    commands.shuffleTeams(host, roomCode);
    const afterShuffle = commands.getHostView(host, roomCode).players;
    expect(
      afterShuffle
        .filter((player) => !player.isHost)
        .every((player) =>
          ["Goblin", "Waffle", "Penguin", "Stapler"].includes(player.teamName ?? ""),
        ),
    ).toBe(true);
    expect(afterShuffle.find((player) => player.isHost)?.teamName).toBeNull();

    const waffle = commands
      .getHostView(host, roomCode)
      .teams.find((team) => team.name === "Waffle");
    if (!waffle) throw new Error("missing Waffle");
    commands.movePlayer(host, roomCode, priya.id, waffle.id);
    expect(commands.getPlayerView(priya, roomCode).team?.name).toBe("Waffle");

    commands.movePlayer(host, roomCode, host.id, waffle.id);
    expect(commands.getHostView(host, roomCode).team?.name).toBe("Waffle");
    commands.movePlayer(host, roomCode, host.id, null);
    expect(commands.getHostView(host, roomCode).team).toBeNull();
  });

  it("shows ready state and last-seen, and lets the host start while someone is unready", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = openLobby(commands);
    commands.setReady(priya, roomCode, true);
    advanceTime(45_000);
    commands.heartbeat(priya, roomCode);
    const hostView = commands.getHostView(host, roomCode);
    const priyaRow = hostView.players.find((player) => player.id === priya.id);
    const samRow = hostView.players.find((player) => player.id === sam.id);
    expect(priyaRow?.isReady).toBe(true);
    expect(samRow?.isReady).toBe(false);
    expect(samRow?.disconnected).toBe(true);
    expect(priyaRow?.disconnected).toBe(false);

    commands.startRound(host, roomCode);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("prompt_reveal");
  });

  it("seats a late lobby joiner so they can ready", () => {
    const { commands } = createGame();
    const roomCode = openLobby(commands);
    commands.joinRoom(jo, { code: roomCode, displayName: "Jo" });
    commands.setReady(jo, roomCode, true);
    const joView = commands.getPlayerView(jo, roomCode);
    expect(joView.team?.name).toBe("Stapler");
    expect(
      commands.getHostView(host, roomCode).players.find((player) => player.id === jo.id)
        ?.isReady,
    ).toBe(true);
  });
});
