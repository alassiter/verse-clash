import { describe, expect, it } from "vitest";
import {
  createGame,
  enterSelecting,
  flushAsync,
  host,
  jo,
  lee,
  openLobby,
  priya,
  sam,
} from "./harness";

async function seatPriyaAndSamTogether(
  commands: ReturnType<typeof createGame>["commands"],
  roomCode: string,
) {
  const goblin = (await commands.getHostView(host, roomCode)).teams.find(
    (team) => team.id === "goblin",
  );
  if (!goblin) throw new Error("missing Goblin");
  await commands.movePlayer(host, roomCode, priya.id, goblin.id);
  await commands.movePlayer(host, roomCode, sam.id, goblin.id);
}

describe("hidden selection in a team room", () => {
  it("starts Round 1 on the first authored prompt", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await openLobby(commands);
    const preview = (await commands.getHostView(host, roomCode)).promptPreview;
    expect(preview?.text).toBeTruthy();
    expect(preview?.wordPools.length).toBeGreaterThan(0);
    await commands.startRound(host, roomCode);
    const player = await commands.getPlayerView(priya, roomCode);
    expect(player.prompt?.text).toBe(preview?.text);
    expect(player.selection).toBeUndefined();
    advanceTime(12_001);
    await commands.heartbeat(host, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("selecting");
    expect((await commands.getPlayerView(priya, roomCode)).selection?.options).toHaveLength(
      5,
    );
  });

  it("deals hidden 2/2/1 options unique within a team and only shows the owner their words", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await openLobby(commands);
    await seatPriyaAndSamTogether(commands, roomCode);
    await enterSelecting(commands, advanceTime, roomCode);

    const priyaView = await commands.getPlayerView(priya, roomCode);
    const samView = await commands.getPlayerView(sam, roomCode);
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
    expect(
      samView.teammates.find((mate) => mate.id === priya.id)?.selectedText,
    ).toBeUndefined();
  });

  it("accepts one submit, keeps it on refresh, and hides the word from teammates", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await openLobby(commands);
    await seatPriyaAndSamTogether(commands, roomCode);
    await enterSelecting(commands, advanceTime, roomCode);
    const optionId = (await commands.getPlayerView(priya, roomCode)).selection!.options[0]
      .id;
    await commands.submitChoice(priya, roomCode, optionId);

    const priyaView = await commands.getPlayerView(priya, roomCode);
    expect(priyaView.selection?.submitted).toBe(true);
    expect(priyaView.selection?.selectedOptionId).toBe(optionId);

    const samView = await commands.getPlayerView(sam, roomCode);
    expect(samView.teammates.find((mate) => mate.id === priya.id)?.submitted).toBe(
      true,
    );
    expect(
      samView.teammates.find((mate) => mate.id === priya.id)?.selectedText,
    ).toBeUndefined();
    expect(samView.teammates.find((mate) => mate.id === priya.id)?.options).toBeUndefined();
  });

  it("isolates team chat and team emojis", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await openLobby(commands);
    await seatPriyaAndSamTogether(commands, roomCode);
    const waffleTeam = (await commands.getHostView(host, roomCode)).teams.find(
      (team) => team.id === "waffle",
    );
    if (!waffleTeam) throw new Error("missing Waffle");
    await commands.movePlayer(host, roomCode, lee.id, waffleTeam.id);
    await enterSelecting(commands, advanceTime, roomCode);
    await commands.sendTeamMessage(priya, roomCode, "someone pick something normal");
    await commands.sendTeamEmoji(priya, roomCode, "👏");

    const goblin = await commands.getPlayerView(priya, roomCode);
    const waffle = await commands.getPlayerView(lee, roomCode);
    expect(goblin.teamChat.map((message) => message.body)).toEqual([
      "someone pick something normal",
      "👏",
    ]);
    expect(waffle.teamChat).toEqual([]);
  });

  it("pauses the timer and fills unsubmitted players from their dealt set when selecting ends", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await openLobby(commands);
    await enterSelecting(commands, advanceTime, roomCode);
    const endsAt = (await commands.getPlayerView(priya, roomCode)).timerEndsAt;
    expect(endsAt).toBeTruthy();
    await commands.pause(host, roomCode);
    expect((await commands.getPlayerView(priya, roomCode)).paused).toBe(true);
    advanceTime(20_000);
    await commands.resume(host, roomCode);
    const resumed = await commands.getPlayerView(priya, roomCode);
    expect(resumed.paused).toBe(false);
    expect(resumed.timerEndsAt).toBe((endsAt ?? 0) + 20_000);

    const dealt = (await commands.getPlayerView(priya, roomCode)).selection!.options.map(
      (option) => option.id,
    );
    advanceTime(90_001);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("selecting");
    await commands.heartbeat(host, roomCode);
    const after = await commands.getPlayerView(priya, roomCode);
    expect(after.phase).toBe("reveal");
    expect(dealt).toContain(after.selection?.selectedOptionId);
  });

  it("gives overflow players an assignment and parks mid-round joiners until the next round", async () => {
    const { commands, advanceTime } = createGame();
    const roomCode = await openLobby(commands);
    await commands.joinRoom(jo, { code: roomCode, displayName: "Jo" });
    const kim = { id: "player-kim" };
    await commands.joinRoom(kim, { code: roomCode, displayName: "Kim" });
    const goblin = (await commands.getHostView(host, roomCode)).teams.find(
      (team) => team.id === "goblin",
    );
    if (!goblin) throw new Error("missing Goblin");
    await commands.movePlayer(host, roomCode, sam.id, goblin.id);
    await commands.movePlayer(host, roomCode, lee.id, goblin.id);
    await commands.movePlayer(host, roomCode, jo.id, goblin.id);
    await commands.movePlayer(host, roomCode, kim.id, goblin.id);
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);
    await enterSelecting(commands, advanceTime, roomCode);
    expect((await commands.getPlayerView(jo, roomCode)).selection?.options).toHaveLength(5);
    expect((await commands.getPlayerView(kim, roomCode)).selection?.options).toHaveLength(
      5,
    );

    const late = { id: "late-1" };
    await commands.joinRoom(late, { code: roomCode, displayName: "Nico" });
    const waiting = await commands.getPlayerView(late, roomCode);
    expect(waiting.waitingForNextRound).toBe(true);
    expect(waiting.selection).toBeUndefined();
  });
});
