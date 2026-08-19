import { describe, expect, it } from "vitest";
import { createGame, host, playThroughSelection, priya, sam } from "./harness";

describe("reveal compositions", () => {
  it("assembles attributed compositions and opens a shared reveal", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await playThroughSelection(commands, advanceTime);
    const view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("reveal");
    expect(view.globalChat).toBeUndefined();
    expect(view.reveal?.composition.some((segment) => segment.type === "static")).toBe(true);
    expect(
      view.reveal?.composition.some(
        (segment) => segment.type === "contribution" && segment.displayName === "Priya",
      ),
    ).toBe(true);
  });

  it("walks one contribution at a time with attribution and records segment votes", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await playThroughSelection(commands, advanceTime);
    let view = await commands.getPlayerView(sam, roomCode);
    expect(view.reveal?.visibleSegments.length).toBe(1);
    advanceTime(4_001);
    await commands.heartbeat(host, roomCode);
    view = await commands.getPlayerView(sam, roomCode);
    let last = view.reveal?.visibleSegments.at(-1);
    for (let i = 0; i < 20 && last?.type !== "contribution"; i += 1) {
      advanceTime(4_001);
      await commands.heartbeat(host, roomCode);
      view = await commands.getPlayerView(sam, roomCode);
      last = view.reveal?.visibleSegments.at(-1);
    }
    if (last?.type !== "contribution") throw new Error("did not reach a contribution");
    expect(view.reveal?.attribution).toBe(`Selected by ${last.displayName}`);
    await commands.sendRevealReaction(priya, roomCode, "😂", last.segmentIndex);
    const reacted = await commands.getPlayerView(priya, roomCode);
    const voted = reacted.reveal?.visibleSegments.find(
      (segment) =>
        segment.type === "contribution" &&
        segment.votedEmojis.includes("😂"),
    );
    expect(voted?.type === "contribution" && voted.votedEmojis).toEqual(["😂"]);
    expect(reacted.globalChat).toBeUndefined();
    if (voted?.type === "contribution") {
      await commands.sendRevealReaction(priya, roomCode, "👏", voted.segmentIndex);
    }
    const switched = await commands.getPlayerView(priya, roomCode);
    const afterSwitch = switched.reveal?.visibleSegments.find(
      (segment) =>
        segment.type === "contribution" &&
        segment.votedEmojis.includes("👏"),
    );
    expect(afterSwitch?.type === "contribution" && afterSwitch.votedEmojis).toEqual(["👏"]);
  });

  it("auto-advances the reveal cursor after a timer once someone heartbeats", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await playThroughSelection(commands, advanceTime);
    const first = await commands.getPlayerView(sam, roomCode);
    expect(first.phase).toBe("reveal");
    expect(first.reveal?.visibleSegments.length).toBe(1);
    advanceTime(4_001);
    expect((await commands.getPlayerView(sam, roomCode)).reveal?.visibleSegments.length).toBe(1);
    await commands.heartbeat(host, roomCode);
    const next = await commands.getPlayerView(sam, roomCode);
    expect(next.reveal?.visibleSegments.length).toBe(2);
  });

  it("lifts hidden-selection after reveal starts so teammates can see selected words", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await playThroughSelection(commands, advanceTime);
    const samView = await commands.getPlayerView(sam, roomCode);
    expect(samView.teammates.find((mate) => mate.id === priya.id)?.selectedText).toBeTruthy();
  });
});
