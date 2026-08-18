import { describe, expect, it } from "vitest";
import { createGame, host, jo, lee, openLobby, priya, sam } from "./harness";

describe("hidden selection in a team room", () => {
  it("lets the host preview and skip prompts before starting Round 1", () => {
    const { commands } = createGame();
    const roomCode = openLobby(commands);
    const first = commands.getHostView(host, roomCode).promptPreview;
    expect(first?.text).toBe("Announce the company's new strategic vision.");
    expect(first?.wordPools.length).toBeGreaterThan(0);
    commands.skipPrompt(host, roomCode);
    const second = commands.getHostView(host, roomCode).promptPreview;
    expect(second?.text).toBe(
      "Give a heartfelt toast to a beloved piece of office equipment.",
    );
    commands.startRound(host, roomCode);
    const player = commands.getPlayerView(priya, roomCode);
    expect(player.prompt?.text).toBe(
      "Give a heartfelt toast to a beloved piece of office equipment.",
    );
  });

  it("deals hidden 2/2/1 options unique within a team and only shows the owner their words", () => {
    const { commands } = createGame();
    const roomCode = openLobby(commands);
    commands.movePlayer(
      host,
      roomCode,
      sam.id,
      commands.getPlayerView(priya, roomCode).team!.id,
    );
    commands.startRound(host, roomCode);
    commands.forceAdvance(host, roomCode);

    const priyaView = commands.getPlayerView(priya, roomCode);
    const samView = commands.getPlayerView(sam, roomCode);
    expect(priyaView.phase).toBe("selecting");
    expect(priyaView.selection?.options).toHaveLength(5);
    expect(priyaView.selection?.playerLabel).toBeTruthy();
    expect(priyaView.template).toBeUndefined();
    expect(priyaView.prompt?.text).toBe(samView.prompt?.text);

    const priyaTexts = priyaView.selection!.options.map((option) => option.text);
    const samTexts = samView.selection!.options.map((option) => option.text);
    expect(new Set([...priyaTexts, ...samTexts]).size).toBe(10);

    expect(samView.teammates.find((mate) => mate.id === priya.id)?.submitted).toBe(
      false,
    );
    expect(samView.teammates.find((mate) => mate.id === priya.id)?.options).toBeUndefined();
    expect(samView.teammates.find((mate) => mate.id === priya.id)?.selectedText).toBeUndefined();
  });

  it("accepts one submit, keeps it on refresh, and hides the word from teammates", () => {
    const { commands } = createGame();
    const roomCode = openLobby(commands);
    commands.movePlayer(
      host,
      roomCode,
      sam.id,
      commands.getPlayerView(priya, roomCode).team!.id,
    );
    commands.startRound(host, roomCode);
    commands.forceAdvance(host, roomCode);
    const optionId = commands.getPlayerView(priya, roomCode).selection!.options[0].id;
    commands.submitChoice(priya, roomCode, optionId);

    const priyaView = commands.getPlayerView(priya, roomCode);
    expect(priyaView.selection?.submitted).toBe(true);
    expect(priyaView.selection?.selectedOptionId).toBe(optionId);

    const samView = commands.getPlayerView(sam, roomCode);
    expect(samView.teammates.find((mate) => mate.id === priya.id)?.submitted).toBe(
      true,
    );
    expect(samView.teammates.find((mate) => mate.id === priya.id)?.selectedText).toBeUndefined();
    expect(samView.teammates.find((mate) => mate.id === priya.id)?.options).toBeUndefined();
  });

  it("isolates team chat and team emojis", () => {
    const { commands } = createGame();
    const roomCode = openLobby(commands);
    commands.startRound(host, roomCode);
    commands.forceAdvance(host, roomCode);
    commands.sendTeamMessage(priya, roomCode, "someone pick something normal");
    commands.sendTeamEmoji(priya, roomCode, "👏");

    const goblin = commands.getPlayerView(priya, roomCode);
    const waffle = commands.getPlayerView(sam, roomCode);
    expect(goblin.teamChat.map((message) => message.body)).toEqual([
      "someone pick something normal",
      "👏",
    ]);
    expect(waffle.teamChat).toEqual([]);
  });

  it("pauses the timer and force-advances unsubmitted players from their dealt set", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = openLobby(commands);
    commands.startRound(host, roomCode);
    commands.forceAdvance(host, roomCode);
    const endsAt = commands.getPlayerView(priya, roomCode).timerEndsAt;
    expect(endsAt).toBeTruthy();
    commands.pause(host, roomCode);
    expect(commands.getPlayerView(priya, roomCode).paused).toBe(true);
    advanceTime(20_000);
    commands.resume(host, roomCode);
    const resumed = commands.getPlayerView(priya, roomCode);
    expect(resumed.paused).toBe(false);
    expect(resumed.timerEndsAt).toBe((endsAt ?? 0) + 20_000);

    const dealt = commands
      .getPlayerView(priya, roomCode)
      .selection!.options.map((option) => option.id);
    commands.forceAdvance(host, roomCode);
    const after = commands.getPlayerView(priya, roomCode);
    expect(["assembling", "reveal"]).toContain(after.phase);
    expect(dealt).toContain(after.selection?.selectedOptionId);
  });

  it("gives overflow players an assignment and parks mid-round joiners until the next round", () => {
    const { commands } = createGame();
    const roomCode = openLobby(commands);
    commands.joinRoom(jo, { code: roomCode, displayName: "Jo" });
    const kim = { id: "player-kim" };
    commands.joinRoom(kim, { code: roomCode, displayName: "Kim" });
    const goblinId = commands.getPlayerView(priya, roomCode).team!.id;
    commands.movePlayer(host, roomCode, sam.id, goblinId);
    commands.movePlayer(host, roomCode, lee.id, goblinId);
    commands.movePlayer(host, roomCode, jo.id, goblinId);
    commands.movePlayer(host, roomCode, kim.id, goblinId);
    commands.startRound(host, roomCode);
    commands.forceAdvance(host, roomCode);
    expect(commands.getPlayerView(jo, roomCode).selection?.options).toHaveLength(5);
    expect(commands.getPlayerView(kim, roomCode).selection?.options).toHaveLength(5);

    const late = { id: "late-1" };
    commands.joinRoom(late, { code: roomCode, displayName: "Nico" });
    const waiting = commands.getPlayerView(late, roomCode);
    expect(waiting.waitingForNextRound).toBe(true);
    expect(waiting.selection).toBeUndefined();
  });
});
