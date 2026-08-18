import { describe, expect, it } from "vitest";
import { createGame, host, priya, sam } from "./harness";

describe("create room and join by code", () => {
  it("gives the host a short room code and a shareable URL", () => {
    const { commands } = createGame();
    const created = commands.createRoom(host, { displayName: "Alex" });
    expect(created.roomCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(created.url).toBe(`/room/${created.roomCode}`);
    const view = commands.getHostView(host, created.roomCode);
    expect(view.phase).toBe("lobby");
    expect(view.isHost).toBe(true);
    expect(view.displayName).toBe("Alex");
    expect(view.instruction).toMatch(/waiting for the host/i);
  });

  it("lets a player join with a code and display name and appear in the lobby", () => {
    const { commands } = createGame();
    const created = commands.createRoom(host, { displayName: "Alex" });
    commands.joinRoom(priya, {
      code: created.roomCode,
      displayName: "Priya",
    });
    const hostView = commands.getHostView(host, created.roomCode);
    const playerView = commands.getPlayerView(priya, created.roomCode);
    expect(hostView.lobby?.players.map((player) => player.displayName)).toEqual(
      ["Alex", "Priya"],
    );
    expect(playerView.displayName).toBe("Priya");
    expect(playerView.isHost).toBe(false);
    expect(playerView.phase).toBe("lobby");
    expect(playerView.phaseName).toBe("Lobby");
  });

  it("restores the same person after a refresh", () => {
    const { commands } = createGame();
    const created = commands.createRoom(host, { displayName: "Alex" });
    commands.joinRoom(priya, {
      code: created.roomCode,
      displayName: "Priya",
    });
    const again = commands.getPlayerView(priya, created.roomCode);
    expect(again.displayName).toBe("Priya");
    expect(again.isHost).toBe(false);
    expect(commands.getHostView(host, created.roomCode).isHost).toBe(true);
  });

  it("returns a player to the same phase after a mid-round refresh", () => {
    const { commands } = createGame();
    const created = commands.createRoom(host, { displayName: "Alex" });
    commands.joinRoom(priya, {
      code: created.roomCode,
      displayName: "Priya",
    });
    commands.joinRoom(sam, {
      code: created.roomCode,
      displayName: "Sam",
    });
    commands.startRound(host, created.roomCode);
    commands.forceAdvance(host, created.roomCode);
    const optionId = commands.getPlayerView(priya, created.roomCode).selection!.options[0].id;
    commands.submitChoice(priya, created.roomCode, optionId);
    const again = commands.getPlayerView(priya, created.roomCode);
    expect(again.phase).toBe("selecting");
    expect(again.displayName).toBe("Priya");
    expect(again.selection?.submitted).toBe(true);
    expect(again.selection?.selectedOptionId).toBe(optionId);
  });
});
