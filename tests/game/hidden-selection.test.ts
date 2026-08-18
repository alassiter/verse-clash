import { describe, expect, it } from "vitest";
import {
  createGame,
  enterSelecting,
  host,
  jo,
  lee,
  openLobby,
  priya,
  sam,
} from "./harness";

function seatPriyaAndSamTogether(commands: ReturnType<typeof createGame>["commands"], roomCode: string) {
  const goblin = commands
    .getHostView(host, roomCode)
    .teams.find((team) => team.id === "goblin");
  if (!goblin) throw new Error("missing Goblin");
  commands.movePlayer(host, roomCode, priya.id, goblin.id);
  commands.movePlayer(host, roomCode, sam.id, goblin.id);
}

describe("hidden selection in a team room", () => {
  it("starts Round 1 on the first authored prompt", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = openLobby(commands);
    const preview = commands.getHostView(host, roomCode).promptPreview;
    expect(preview?.text).toBe("Announce the company's new strategic vision.");
    expect(preview?.wordPools.length).toBeGreaterThan(0);
    commands.startRound(host, roomCode);
    const player = commands.getPlayerView(priya, roomCode);
    expect(player.prompt?.text).toBe("Announce the company's new strategic vision.");
    expect(player.selection).toBeUndefined();
    advanceTime(12_001);
    commands.heartbeat(host, roomCode);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("selecting");
    expect(commands.getPlayerView(priya, roomCode).selection?.options).toHaveLength(5);
  });

  it("deals hidden 2/2/1 options unique within a team and only shows the owner their words", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = openLobby(commands);
    seatPriyaAndSamTogether(commands, roomCode);
    enterSelecting(commands, advanceTime, roomCode);

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
    const { commands, advanceTime } = createGame();
    const roomCode = openLobby(commands);
    seatPriyaAndSamTogether(commands, roomCode);
    enterSelecting(commands, advanceTime, roomCode);
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
    const { commands, advanceTime } = createGame();
    const roomCode = openLobby(commands);
    seatPriyaAndSamTogether(commands, roomCode);
    const waffleTeam = commands
      .getHostView(host, roomCode)
      .teams.find((team) => team.id === "waffle");
    if (!waffleTeam) throw new Error("missing Waffle");
    commands.movePlayer(host, roomCode, lee.id, waffleTeam.id);
    enterSelecting(commands, advanceTime, roomCode);
    commands.sendTeamMessage(priya, roomCode, "someone pick something normal");
    commands.sendTeamEmoji(priya, roomCode, "👏");

    const goblin = commands.getPlayerView(priya, roomCode);
    const waffle = commands.getPlayerView(lee, roomCode);
    expect(goblin.teamChat.map((message) => message.body)).toEqual([
      "someone pick something normal",
      "👏",
    ]);
    expect(waffle.teamChat).toEqual([]);
  });

  it("pauses the timer and fills unsubmitted players from their dealt set when selecting ends", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = openLobby(commands);
    enterSelecting(commands, advanceTime, roomCode);
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
    advanceTime(90_001);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("selecting");
    commands.heartbeat(host, roomCode);
    const after = commands.getPlayerView(priya, roomCode);
    expect(after.phase).toBe("reveal");
    expect(dealt).toContain(after.selection?.selectedOptionId);
  });

  it("gives overflow players an assignment and parks mid-round joiners until the next round", () => {
    const { commands, advanceTime } = createGame();
    const roomCode = openLobby(commands);
    commands.joinRoom(jo, { code: roomCode, displayName: "Jo" });
    const kim = { id: "player-kim" };
    commands.joinRoom(kim, { code: roomCode, displayName: "Kim" });
    const goblin = commands
      .getHostView(host, roomCode)
      .teams.find((team) => team.id === "goblin");
    if (!goblin) throw new Error("missing Goblin");
    commands.movePlayer(host, roomCode, sam.id, goblin.id);
    commands.movePlayer(host, roomCode, lee.id, goblin.id);
    commands.movePlayer(host, roomCode, jo.id, goblin.id);
    commands.movePlayer(host, roomCode, kim.id, goblin.id);
    commands.movePlayer(host, roomCode, priya.id, goblin.id);
    enterSelecting(commands, advanceTime, roomCode);
    expect(commands.getPlayerView(jo, roomCode).selection?.options).toHaveLength(5);
    expect(commands.getPlayerView(kim, roomCode).selection?.options).toHaveLength(5);

    const late = { id: "late-1" };
    commands.joinRoom(late, { code: roomCode, displayName: "Nico" });
    const waiting = commands.getPlayerView(late, roomCode);
    expect(waiting.waitingForNextRound).toBe(true);
    expect(waiting.selection).toBeUndefined();
  });
});
