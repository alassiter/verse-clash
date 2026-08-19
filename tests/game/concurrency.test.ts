import { describe, expect, it } from "vitest";
import type { RoomStore } from "@/lib/game/room-store";
import { createInMemoryRoomStore } from "@/lib/game/room-store";
import { createGame, host, lee, openLobby, priya, sam, submitUntilDone } from "./harness";

// Wraps a RoomStore so its first N `save` calls report a version conflict
// (as if another request had saved in between), forcing callers through the
// retry path in `withRoom` (lib/game/await commands.ts).
function withInjectedConflicts(store: RoomStore, conflictsRemaining: number): RoomStore {
  let remaining = conflictsRemaining;
  return {
    load: store.load,
    insert: store.insert,
    async save(code, state, expectedVersion) {
      if (remaining > 0) {
        remaining -= 1;
        return false;
      }
      return store.save(code, state, expectedVersion);
    },
  };
}

describe("optimistic concurrency", () => {
  it("retries a save that lost a version race and still applies the mutation", async () => {
    const store = createInMemoryRoomStore();
    const { commands } = createGame({ store });
    const roomCode = await openLobby(commands);

    const flaky = createGame({ store: withInjectedConflicts(store, 2) }).commands;
    await flaky.setReady(priya, roomCode, true);

    const view = await commands.getPlayerView(priya, roomCode);
    expect(view.isReady).toBe(true);
  });

  it("gives up with a RoomError once retries are exhausted", async () => {
    const store = createInMemoryRoomStore();
    const { commands } = createGame({ store });
    const roomCode = await openLobby(commands);

    const alwaysConflicts = createGame({
      store: withInjectedConflicts(store, 100),
    }).commands;

    await expect(alwaysConflicts.setReady(priya, roomCode, true)).rejects.toThrow(
      /changed at the same time/,
    );
  });

  it("applies two players' concurrent votes for different teams without losing either write", async () => {
    const store = createInMemoryRoomStore();
    const { commands, advanceTime } = createGame({ store });
    const roomCode = await openLobby(commands);
    const teams = (await commands.getHostView(host, roomCode)).teams;
    const goblin = teams.find((team) => team.id === "goblin");
    const waffle = teams.find((team) => team.id === "waffle");
    if (!goblin || !waffle) throw new Error("missing seed teams");
    await commands.movePlayer(host, roomCode, priya.id, goblin.id);
    await commands.movePlayer(host, roomCode, sam.id, waffle.id);
    await commands.movePlayer(host, roomCode, lee.id, goblin.id);
    await commands.startRound(host, roomCode);
    advanceTime(12_001);
    await commands.heartbeat(host, roomCode);
    for (const actor of [priya, sam, lee]) {
      await submitUntilDone(commands, actor, roomCode);
    }
    for (let i = 0; i < 80; i += 1) {
      if ((await commands.getPlayerView(priya, roomCode)).phase === "voting") break;
      advanceTime(4_001);
      await commands.heartbeat(host, roomCode);
    }
    expect((await commands.getPlayerView(priya, roomCode)).phase).toBe("voting");

    // Two independent RoomCommands instances share the same underlying
    // store, simulating two concurrent server-action invocations racing on
    // the same room.
    const a = createGame({ store }).commands;
    const b = createGame({ store }).commands;
    await Promise.all([
      a.vote(priya, roomCode, goblin.id),
      b.vote(sam, roomCode, waffle.id),
    ]);

    advanceTime(30_001);
    await commands.heartbeat(host, roomCode);
    const standings = await commands.getPlayerView(priya, roomCode);
    expect(standings.phase).toBe("standings");
    expect(
      standings.standings?.find((row) => row.teamId === goblin.id)?.lastRound
        ?.crowdFavoriteBonus,
    ).toBe(3);
    expect(
      standings.standings?.find((row) => row.teamId === waffle.id)?.lastRound
        ?.crowdFavoriteBonus,
    ).toBe(3);
  });
});
