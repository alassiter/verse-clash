import { describe, expect, it } from "vitest";
import { createGame, flushAsync, host, lee, priya, sam, submitUntilDone } from "./harness";
import type { RoomCommands } from "@/lib/game";

async function submitAll(commands: RoomCommands, actor: { id: string }, roomCode: string) {
  await submitUntilDone(commands, actor, roomCode);
}

async function playRound(
  commands: RoomCommands,
  advanceTime: (ms: number) => void,
  roomCode: string,
  isFirstRound: boolean,
  votingTeamId: string,
) {
  if (isFirstRound) {
    await commands.startRound(host, roomCode);
  } else {
    await commands.startNextRound(host, roomCode);
  }
  advanceTime(12_001);
  await commands.heartbeat(host, roomCode);

  for (const actor of [priya, sam, lee]) {
    await submitAll(commands, actor, roomCode);
  }
  await flushAsync();

    for (let i = 0; i < 120; i += 1) {
      if ((await commands.getPlayerView(priya, roomCode)).phase === "voting") break;
      advanceTime(4_001);
      await commands.heartbeat(host, roomCode);
    }
  await commands.vote(priya, roomCode, votingTeamId);
  advanceTime(15_001);
  await commands.heartbeat(host, roomCode);
}

describe("game over summary", () => {
  it("highlights the highest-scoring verse and the overall winner once the third round ends", async () => {
    const { commands, advanceTime } = createGame();
    const created = await commands.createRoom(host, { displayName: "Alex" });
    const roomCode = created.roomCode;
    await commands.joinRoom(priya, { code: roomCode, displayName: "Priya" });
    await commands.joinRoom(sam, { code: roomCode, displayName: "Sam" });
    await commands.joinRoom(lee, { code: roomCode, displayName: "Lee" });
    const goblin = (await commands.getHostView(host, roomCode)).teams.find((t) => t.id === "goblin")!;
    const waffle = (await commands.getHostView(host, roomCode)).teams.find((t) => t.id === "waffle")!;
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);
    await commands.movePlayer(host, roomCode, sam.id, goblin.id);
    await commands.movePlayer(host, roomCode, lee.id, waffle.id);

    await playRound(commands, advanceTime, roomCode, true, goblin.id);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("standings");
    await playRound(commands, advanceTime, roomCode, false, goblin.id);
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("standings");
    await playRound(commands, advanceTime, roomCode, false, goblin.id);

    const view = await commands.getPlayerView(priya, roomCode);
    expect(view.phase).toBe("ended");

    expect(view.bestVerse).toBeDefined();
    expect(view.bestVerse!.promptText).toBeTruthy();
    expect(view.bestVerse!.teamName).toBeTruthy();
    expect(view.bestVerse!.score).toBeGreaterThan(0);
    expect(view.bestVerse!.segments.some((segment) => segment.type === "contribution")).toBe(
      true,
    );

    expect(view.winner).toBeDefined();
    expect(view.winner!.teamNames.length).toBeGreaterThan(0);
    const maxStanding = Math.max(...view.standings!.map((row) => row.totalScore));
    expect(view.winner!.totalScore).toBe(maxStanding);
    const winningRows = view.standings!.filter((row) => row.totalScore === maxStanding);
    expect(view.winner!.teamNames.sort()).toEqual(
      winningRows.map((row) => row.teamName).sort(),
    );
  });
});
