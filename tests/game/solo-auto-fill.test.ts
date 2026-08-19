import { describe, expect, it } from "vitest";
import { createGame, enterSelecting, flushAsync, host, priya, sam } from "./harness";

describe("solo team auto-fill", () => {
  it("fills the rest of a solo team's slots with real auto-picked words and sends them to composition", async () => {
    const { commands, advanceTime } = createGame();
    const created = await commands.createRoom(host, { displayName: "Alex" });
    const roomCode = created.roomCode;
    await commands.joinRoom(priya, { code: roomCode, displayName: "Priya" });
    const goblin = (await commands.getHostView(host, roomCode)).teams.find((t) => t.id === "goblin")!;
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);

    await enterSelecting(commands, advanceTime, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).soloAutoFill).toBe(true);

    const optionId = (await commands.getPlayerView(priya, roomCode)).selection!.options[0].id;
    await commands.submitChoice(priya, roomCode, optionId);
    await flushAsync();

    const view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("reveal");
    const contributions = view.reveal!.composition.filter((s) => s.type === "contribution");
    expect(contributions).toHaveLength(4);
    expect(contributions.filter((c) => c.displayName === "Priya")).toHaveLength(1);
    expect(contributions.filter((c) => c.displayName === "Auto-fill")).toHaveLength(3);
    expect(contributions.some((c) => c.displayName === "House")).toBe(false);
  });

  it("does not mark soloAutoFill and still uses the house filler when a team has more than one active player", async () => {
    const { commands, advanceTime } = createGame();
    const created = await commands.createRoom(host, { displayName: "Alex" });
    const roomCode = created.roomCode;
    await commands.joinRoom(priya, { code: roomCode, displayName: "Priya" });
    await commands.joinRoom(sam, { code: roomCode, displayName: "Sam" });
    const goblin = (await commands.getHostView(host, roomCode)).teams.find((t) => t.id === "goblin")!;
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);
    await commands.movePlayer(host, roomCode, sam.id, goblin.id);

    await enterSelecting(commands, advanceTime, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).soloAutoFill).toBeUndefined();

    for (const actor of [priya, sam]) {
      const optionId = (await commands.getPlayerView(actor, roomCode)).selection!.options[0].id;
      await commands.submitChoice(actor, roomCode, optionId);
    }
    await flushAsync();

    const view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("reveal");
    const contributions = view.reveal!.composition.filter((s) => s.type === "contribution");
    expect(contributions.filter((c) => c.displayName === "House")).toHaveLength(2);
    expect(contributions.some((c) => c.displayName === "Auto-fill")).toBe(false);
  });

  it("still auto-fills the untouched slots for a solo player under double_trouble", async () => {
    const { commands, advanceTime } = createGame();
    const created = await commands.createRoom(host, { displayName: "Alex" });
    const roomCode = created.roomCode;
    await commands.joinRoom(priya, { code: roomCode, displayName: "Priya" });
    const goblin = (await commands.getHostView(host, roomCode)).teams.find((t) => t.id === "goblin")!;
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);

    await commands.startRound(host, roomCode); // round 1: straight
    await commands.endRound(host, roomCode);
    await commands.startNextRound(host, roomCode); // round 2: straight
    await commands.endRound(host, roomCode);
    await commands.startNextRound(host, roomCode); // round 3: chaos (double_trouble, random=0.1)

    advanceTime(12_001);
    await commands.heartbeat(host, roomCode);
    let view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("selecting");
    expect(view.chaosCard?.id).toBe("double_trouble");
    expect(view.soloAutoFill).toBe(true);

    await commands.submitChoice(priya, roomCode, view.selection!.options[0].id);
    view = await commands.getPlayerView(priya, roomCode);
    expect(view.selection?.submitted).toBe(false); // one more of priya's own words to place
    await commands.submitChoice(priya, roomCode, view.selection!.options[0].id);
    await flushAsync();

    view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("reveal");
    const contributions = view.reveal!.composition.filter((s) => s.type === "contribution");
    expect(contributions).toHaveLength(4);
    expect(contributions.filter((c) => c.displayName === "Priya")).toHaveLength(2);
    expect(contributions.filter((c) => c.displayName === "Auto-fill")).toHaveLength(2);
  });
});
