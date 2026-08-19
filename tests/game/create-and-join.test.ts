import { describe, expect, it } from "vitest";
import { createGame, enterSelecting, host, priya, sam } from "./harness";

describe("create room and join by code", () => {
  it("gives the host a short room code and a shareable URL", async () => {
    const { commands } = createGame();
    const created = await commands.createRoom(host, { displayName: "Alex" });
    expect(created.roomCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(created.url).toBe(`/room/${created.roomCode}`);
    const view = await commands.getHostView(host, created.roomCode);
    expect(view.phase).toBe("gathering");
    expect(view.isHost).toBe(true);
    expect(view.displayName).toBe("Alex");
    expect(view.instruction).toMatch(/waiting for the host/i);
  });

  it("lets a player join with a code and display name and appear in the lobby", async () => {
    const { commands } = createGame();
    const created = await commands.createRoom(host, { displayName: "Alex" });
    await commands.joinRoom(priya, {
      code: created.roomCode,
      displayName: "Priya",
    });
    const hostView = await commands.getHostView(host, created.roomCode);
    const playerView = await commands.getPlayerView(priya, created.roomCode);
    expect(hostView.lobby?.players.map((player) => player.displayName)).toEqual(
      ["Alex", "Priya"],
    );
    expect(playerView.displayName).toBe("Priya");
    expect(playerView.isHost).toBe(false);
    expect(playerView.phase).toBe("gathering");
    expect(playerView.phaseName).toBe("Gathering");
    expect(playerView.team).toBeNull();
  });

  it("restores the same person after a refresh", async () => {
    const { commands } = createGame();
    const created = await commands.createRoom(host, { displayName: "Alex" });
    await commands.joinRoom(priya, {
      code: created.roomCode,
      displayName: "Priya",
    });
    const again = await commands.getPlayerView(priya, created.roomCode);
    expect(again.displayName).toBe("Priya");
    expect(again.isHost).toBe(false);
    expect((await commands.getHostView(host, created.roomCode)).isHost).toBe(true);
  });

  it("returns a player to the same phase after a mid-round refresh", async () => {
    const { commands, advanceTime } = createGame();
    const created = await commands.createRoom(host, { displayName: "Alex" });
    await commands.joinRoom(priya, {
      code: created.roomCode,
      displayName: "Priya",
    });
    await commands.joinRoom(sam, {
      code: created.roomCode,
      displayName: "Sam",
    });
    await enterSelecting(commands, advanceTime, created.roomCode);
    const optionId = (await commands.getPlayerView(priya, created.roomCode)).selection!
      .options[0].id;
    await commands.submitChoice(priya, created.roomCode, optionId);
    const again = await commands.getPlayerView(priya, created.roomCode);
    expect(again.phase).toBe("selecting");
    expect(again.displayName).toBe("Priya");
    expect(again.selection?.submitted).toBe(true);
    expect(again.selection?.selectedOptionId).toBe(optionId);
  });

  it("does not move the game when someone only looks after time has passed", async () => {
    const { commands, advanceTime } = createGame();
    const created = await commands.createRoom(host, { displayName: "Alex" });
    await commands.joinRoom(priya, {
      code: created.roomCode,
      displayName: "Priya",
    });
    await commands.startRound(host, created.roomCode);
    expect((await commands.getPlayerView(priya, created.roomCode)).phase).toBe(
      "prompt_reveal",
    );
    advanceTime(12_001);
    expect((await commands.getPlayerView(priya, created.roomCode)).phase).toBe(
      "prompt_reveal",
    );
    await commands.heartbeat(host, created.roomCode);
    expect((await commands.getPlayerView(priya, created.roomCode)).phase).toBe("selecting");
  });
});
