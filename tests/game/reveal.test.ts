import { describe, expect, it } from "vitest";
import { createGame, host, playThroughSelection, priya, sam } from "./harness";

describe("reveal compositions", () => {
  it("assembles attributed compositions, fills unused slots, and opens a shared reveal", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = playThroughSelection(commands, advanceTime);
    const view = commands.getPlayerView(priya, roomCode);
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

  it("walks one contribution at a time with attribution and records a word vote", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = playThroughSelection(commands, advanceTime);
    let view = commands.getPlayerView(sam, roomCode);
    expect(view.reveal?.visibleSegments.length).toBe(1);
    advanceTime(2_501);
    commands.heartbeat(host, roomCode);
    view = commands.getPlayerView(sam, roomCode);
    const last = view.reveal?.visibleSegments.at(-1);
    if (last?.type === "contribution") {
      expect(view.reveal?.attribution).toBe(`Selected by ${last.displayName}`);
      commands.sendRevealReaction(priya, roomCode, "😂", last.segmentIndex);
    }
    const reacted = commands.getPlayerView(priya, roomCode);
    const voted = reacted.reveal?.visibleSegments.find(
      (segment) => segment.type === "contribution",
    );
    expect(voted?.type === "contribution" && voted.votedEmojis).toEqual(["😂"]);
    expect(reacted.globalChat).toBeUndefined();
    if (voted?.type === "contribution") {
      commands.sendRevealReaction(priya, roomCode, "👏", voted.segmentIndex);
    }
    const switched = commands.getPlayerView(priya, roomCode);
    const afterSwitch = switched.reveal?.visibleSegments.find(
      (segment) => segment.type === "contribution",
    );
    expect(afterSwitch?.type === "contribution" && afterSwitch.votedEmojis).toEqual([
      "👏",
    ]);
  });

  it("auto-advances the reveal cursor after a short timer only once someone heartbeats", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = playThroughSelection(commands, advanceTime);
    const first = commands.getPlayerView(sam, roomCode);
    expect(first.phase).toBe("reveal");
    expect(first.reveal?.visibleSegments.length).toBe(1);
    advanceTime(2_501);
    expect(commands.getPlayerView(sam, roomCode).reveal?.visibleSegments.length).toBe(
      1,
    );
    commands.heartbeat(host, roomCode);
    const next = commands.getPlayerView(sam, roomCode);
    expect(next.reveal?.visibleSegments.length).toBe(2);
  });

  it("lifts hidden-selection after reveal starts so teammates can see selected words", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = playThroughSelection(commands, advanceTime);
    const samView = commands.getPlayerView(sam, roomCode);
    expect(samView.teammates.find((mate) => mate.id === priya.id)?.selectedText).toBeTruthy();
  });
});
