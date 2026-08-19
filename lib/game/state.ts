import type { AssembledSegment, DealtAssignment } from "@/lib/content";
import type { Phase } from "@/lib/game/types";

export const TEAM_SEEDS = [
  { id: "goblin", name: "Goblin", color: "green" },
  { id: "waffle", name: "Waffle", color: "amber" },
  { id: "penguin", name: "Penguin", color: "slate" },
  { id: "stapler", name: "Stapler", color: "rose" },
] as const;

export const REVEAL_EMOJIS = ["😂", "👏", "🤯", "❤️", "😮"] as const;
export const DISCONNECT_AFTER_MS = 30_000;

export type TeamState = {
  id: string;
  name: string;
  color: string;
  wins: number;
};

export type PlayerState = {
  id: string;
  displayName: string;
  teamId: string | null;
  isHost: boolean;
  isReady: boolean;
  lastSeenAt: number;
  joinedRound: number;
};

export type AssignmentState = DealtAssignment & {
  selectedOptionId: string | null;
  submittedAt: number | null;
};

export type TeamMessageState = {
  teamId: string;
  playerId: string;
  body: string;
};

export type RoundState = {
  id: string;
  number: number;
  type: "straight";
  promptId: string;
  templateId: string;
  phase: Phase;
  phaseEndsAt: number | null;
  assignments: AssignmentState[];
  compositions: Array<{ teamId: string; segments: AssembledSegment[] }>;
  reveal: { teamIndex: number; segmentIndex: number };
  votes: Array<{ playerId: string; teamId: string }>;
  reactions: Array<{
    playerId: string;
    emoji: string;
    teamIndex: number;
    segmentIndex: number;
  }>;
};

export type RoomState = {
  id: string;
  code: string;
  hostId: string;
  status: "lobby" | "in_progress" | "ended";
  paused: boolean;
  pauseStartedAt: number | null;
  contentMode: "work_safe";
  promptCursor: number;
  teams: TeamState[];
  players: PlayerState[];
  rounds: RoundState[];
  teamMessages: TeamMessageState[];
};

export function currentRound(room: RoomState): RoundState | undefined {
  return room.rounds.at(-1);
}
