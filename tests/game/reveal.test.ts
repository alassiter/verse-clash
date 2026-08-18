import { describe, expect, it } from "vitest";
import { createGame, host, lee, openLobby, priya, sam } from "./harness";

function playThroughSelection(commands: ReturnType<typeof createGame>["commands"]) {
  const roomCode = openLobby(commands);
  commands.startRound(host, roomCode);
  commands.forceAdvance(host, roomCode);
  for (const actor of [priya, sam, lee]) {
    const optionId = commands.getPlayerView(actor, roomCode).selection!.options[0].id;
    commands.submitChoice(actor, roomCode, optionId);
  }
  return roomCode;
}

describe("reveal compositions", () => {
  it("assembles attributed compositions, fills unused slots, and opens a shared reveal", () => {
    const { commands } = createGame();
    const roomCode = playThroughSelection(commands);
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

  it("walks one contribution at a time with attribution and allows reveal emoji bursts", () => {
    const { commands } = createGame();
    const roomCode = playThroughSelection(commands);
    let view = commands.getPlayerView(sam, roomCode);
    expect(view.reveal?.visibleSegments.length).toBe(1);
    commands.advanceReveal(host, roomCode);
    view = commands.getPlayerView(sam, roomCode);
    const last = view.reveal?.visibleSegments.at(-1);
    if (last?.type === "contribution") {
      expect(view.reveal?.attribution).toBe(`Selected by ${last.displayName}`);
    }
    commands.sendRevealReaction(priya, roomCode, "😂");
    const reacted = commands.getPlayerView(sam, roomCode);
    expect(reacted.reveal?.bursts.map((burst) => burst.emoji)).toContain("😂");
    expect(reacted.globalChat).toBeUndefined();
  });

  it("auto-advances the reveal cursor after a short timer", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = playThroughSelection(commands);
    const first = commands.getPlayerView(sam, roomCode);
    expect(first.phase).toBe("reveal");
    expect(first.reveal?.visibleSegments.length).toBe(1);
    advanceTime(4_001);
    const next = commands.getPlayerView(sam, roomCode);
    expect(next.reveal?.visibleSegments.length).toBe(2);
  });

  it("lifts hidden-selection after reveal starts so teammates can see selected words", () => {
    const { commands } = createGame();
    const roomCode = openLobby(commands);
    const goblinId = commands.getPlayerView(priya, roomCode).team!.id;
    commands.movePlayer(host, roomCode, sam.id, goblinId);
    commands.startRound(host, roomCode);
    commands.forceAdvance(host, roomCode);
    const optionId = commands.getPlayerView(priya, roomCode).selection!.options[0].id;
    commands.submitChoice(priya, roomCode, optionId);
    commands.forceAdvance(host, roomCode);
    const samView = commands.getPlayerView(sam, roomCode);
    expect(samView.teammates.find((mate) => mate.id === priya.id)?.selectedText).toBeTruthy();
  });
});
