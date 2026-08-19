import { describe, expect, it } from "vitest";
import { createGame, host, playThroughSelection, priya, sam } from "./harness";

describe("reveal compositions", () => {
  it("assembles attributed compositions, fills unused slots, and opens a shared reveal", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await playThroughSelection(commands, advanceTime);
    const view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("reveal");
    expect(view.teamChatPrimary).toBe(false);
    expect(view.globalChat).toBeUndefined();
    const composition = view.reveal?.composition;
    expect(composition?.some((segment) => segment.type === "static")).toBe(true);
    expect(
      composition?.some(
        (segment) =>
          segment.type === "contribution" && segment.displayName === "Priya",
      ),
    ).toBe(true);
    expect(
      composition?.some(
        (segment) =>
          segment.type === "contribution" &&
          segment.displayName === "House" &&
          segment.text === "proceed",
      ),
    ).toBe(true);
  });

  it("walks one contribution at a time with attribution and allows reveal emoji bursts", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await playThroughSelection(commands, advanceTime);
    let view = await commands.getPlayerView(sam, roomCode);
    expect(view.reveal?.visibleSegments.length).toBe(1);
    advanceTime(4_001);
    await commands.heartbeat(host, roomCode);
    view = await commands.getPlayerView(sam, roomCode);
    const last = view.reveal?.visibleSegments.at(-1);
    if (last?.type === "contribution") {
      expect(view.reveal?.attribution).toBe(`Selected by ${last.displayName}`);
    }
    await commands.sendRevealReaction(priya, roomCode, "😂");
    const reacted = await commands.getPlayerView(sam, roomCode);
    expect(reacted.reveal?.bursts.map((burst) => burst.emoji)).toContain("😂");
    expect(reacted.globalChat).toBeUndefined();
  });

  it("auto-advances the reveal cursor after a short timer only once someone heartbeats", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await playThroughSelection(commands, advanceTime);
    const first = await commands.getPlayerView(sam, roomCode);
    expect(first.phase).toBe("reveal");
    expect(first.reveal?.visibleSegments.length).toBe(1);
    advanceTime(4_001);
    expect(
      (await commands.getPlayerView(sam, roomCode)).reveal?.visibleSegments.length,
    ).toBe(1);
    await commands.heartbeat(host, roomCode);
    const next = await commands.getPlayerView(sam, roomCode);
    expect(next.reveal?.visibleSegments.length).toBe(2);
  });

  it("lifts hidden-selection after reveal starts so teammates can see selected words", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await playThroughSelection(commands, advanceTime);
    const samView = await commands.getPlayerView(sam, roomCode);
    expect(
      samView.teammates.find((mate) => mate.id === priya.id)?.selectedText,
    ).toBeTruthy();
  });
});
