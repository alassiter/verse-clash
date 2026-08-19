"use server";

import { RoomError, type HostView, type PlayerView } from "@/lib/game";
import { getRoomCommands } from "@/lib/game/runtime";
import { actorFromCookies } from "@/lib/session";

type Result<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function fail(error: unknown): { ok: false; error: string } {
  if (error instanceof RoomError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Something went wrong." };
}

export async function createRoomAction(
  displayName: string,
): Promise<Result<{ roomCode: string; url: string }>> {
  try {
    const actor = await actorFromCookies();
    const created = getRoomCommands().createRoom(actor, {
      displayName: displayName.trim() || "Host",
    });
    return { ok: true, ...created };
  } catch (error) {
    return fail(error);
  }
}

export async function joinRoomAction(
  code: string,
  displayName: string,
): Promise<Result<{ roomCode: string }>> {
  try {
    const actor = await actorFromCookies();
    const roomCode = code.trim().toUpperCase();
    getRoomCommands().joinRoom(actor, {
      code: roomCode,
      displayName: displayName.trim() || "Player",
    });
    return { ok: true, roomCode };
  } catch (error) {
    return fail(error);
  }
}

export async function getPlayerViewAction(
  roomCode: string,
): Promise<Result<{ view: PlayerView }>> {
  try {
    const actor = await actorFromCookies();
    getRoomCommands().heartbeat(actor, roomCode);
    return { ok: true, view: getRoomCommands().getPlayerView(actor, roomCode) };
  } catch (error) {
    return fail(error);
  }
}

export async function getHostViewAction(
  roomCode: string,
): Promise<Result<{ view: HostView }>> {
  try {
    const actor = await actorFromCookies();
    getRoomCommands().heartbeat(actor, roomCode);
    return { ok: true, view: getRoomCommands().getHostView(actor, roomCode) };
  } catch (error) {
    return fail(error);
  }
}

export async function setReadyAction(roomCode: string, ready: boolean) {
  try {
    getRoomCommands().setReady(await actorFromCookies(), roomCode, ready);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function shuffleTeamsAction(roomCode: string) {
  try {
    getRoomCommands().shuffleTeams(await actorFromCookies(), roomCode);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function movePlayerAction(
  roomCode: string,
  playerId: string,
  teamId: string | null,
) {
  try {
    getRoomCommands().movePlayer(
      await actorFromCookies(),
      roomCode,
      playerId,
      teamId,
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function startRoundAction(roomCode: string) {
  try {
    getRoomCommands().startRound(await actorFromCookies(), roomCode);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function submitChoiceAction(roomCode: string, optionId: string) {
  try {
    getRoomCommands().submitChoice(await actorFromCookies(), roomCode, optionId);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function pauseAction(roomCode: string) {
  try {
    getRoomCommands().pause(await actorFromCookies(), roomCode);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function resumeAction(roomCode: string) {
  try {
    getRoomCommands().resume(await actorFromCookies(), roomCode);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function endRoundAction(roomCode: string) {
  try {
    getRoomCommands().endRound(await actorFromCookies(), roomCode);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function sendRevealReactionAction(roomCode: string, emoji: string) {
  try {
    getRoomCommands().sendRevealReaction(await actorFromCookies(), roomCode, emoji);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function voteAction(roomCode: string, teamId: string) {
  try {
    getRoomCommands().vote(await actorFromCookies(), roomCode, teamId);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function startNextRoundAction(roomCode: string) {
  try {
    getRoomCommands().startNextRound(await actorFromCookies(), roomCode);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function endGameAction(roomCode: string) {
  try {
    getRoomCommands().endGame(await actorFromCookies(), roomCode);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
