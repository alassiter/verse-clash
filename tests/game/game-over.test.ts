import { describe, expect, it } from "vitest";
import { createGame, flushAsync, host, lee, priya, sam } from "./harness";
import type { RoomCommands } from "@/lib/game";

function submitAll(commands: RoomCommands, actor: { id: string }, roomCode: string) {
  for (let i = 0; i < 4; i += 1) {
    const selection = commands.getPlayerView(actor, roomCode).selection;
    if (!selection || selection.submitted) return;
    commands.submitChoice(actor, roomCode, selection.options[0].id);
  }
}

async function playRound(
  commands: RoomCommands,
  advanceTime: (ms: number) => void,
  roomCode: string,
  isFirstRound: boolean,
  votingTeamId: string,
) {
  if (isFirstRound) {
    commands.startRound(host, roomCode);
  } else {
    commands.startNextRound(host, roomCode);
  }
  advanceTime(12_001);
  commands.heartbeat(host, roomCode);

  for (const actor of [priya, sam, lee]) {
    submitAll(commands, actor, roomCode);
  }
  await flushAsync();

  for (let i = 0; i < 40; i += 1) {
    if (commands.getPlayerView(priya, roomCode).phase === "voting") break;
    advanceTime(4_001);
    commands.heartbeat(host, roomCode);
  }
  commands.vote(priya, roomCode, votingTeamId);
  advanceTime(15_001);
  commands.heartbeat(host, roomCode);
}

describe("game over summary", () => {
  it("highlights the highest-scoring verse and the overall winner once the third round ends", async () => {
    const { commands, advanceTime } = createGame();
    const created = commands.createRoom(host, { displayName: "Alex" });
    const roomCode = created.roomCode;
    commands.joinRoom(priya, { code: roomCode, displayName: "Priya" });
    commands.joinRoom(sam, { code: roomCode, displayName: "Sam" });
    commands.joinRoom(lee, { code: roomCode, displayName: "Lee" });
    const goblin = commands.getHostView(host, roomCode).teams.find((t) => t.id === "goblin")!;
    const waffle = commands.getHostView(host, roomCode).teams.find((t) => t.id === "waffle")!;
    commands.movePlayer(host, roomCode, priya.id, goblin.id);
    commands.movePlayer(host, roomCode, sam.id, goblin.id);
    commands.movePlayer(host, roomCode, lee.id, waffle.id);

    await playRound(commands, advanceTime, roomCode, true, goblin.id);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("standings");
    await playRound(commands, advanceTime, roomCode, false, goblin.id);
    expect(commands.getPlayerView(priya, roomCode).phase).toBe("standings");
    await playRound(commands, advanceTime, roomCode, false, goblin.id);

    const view = commands.getPlayerView(priya, roomCode);
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
