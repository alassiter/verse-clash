import type { AssembledSegment, ChaosCardId, DealtAssignment } from "@/lib/content";
import type { TeamRoundScore } from "@/lib/scoring/combos";
import type { JudgeScore, Phase } from "@/lib/game/types";

export const TEAM_SEEDS = [
  { id: "goblin", name: "Red", color: "red" },
  { id: "waffle", name: "Blue", color: "blue" },
  { id: "penguin", name: "Green", color: "green" },
  { id: "stapler", name: "Yellow", color: "yellow" },
] as const;

export const REVEAL_EMOJIS = ["😂", "👏", "🤯", "❤️", "😮"] as const;
export const DISCONNECT_AFTER_MS = 30_000;
/** Assignment playerId prefix for slots a solo team had no one around to fill.
 * Encodes the team id directly since there's no real player record behind it. */
export const AUTO_FILL_PLAYER_PREFIX = "auto-";
export const AUTO_FILL_DISPLAY_NAME = "Auto-fill";

export type TeamState = {
  id: string;
  name: string;
  color: string;
  totalScore: number;
  roundsWon: number;
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

export type PendingComposition = {
  requestId: string;
  status: "pending" | "resolved" | "timed_out" | "cancelled";
  startedAt: number;
};

export type RoundState = {
  id: string;
  number: number;
  type: "straight" | "chaos";
  chaosCard: ChaosCardId | null;
  promptId: string;
  templateId: string;
  phase: Phase;
  phaseEndsAt: number | null;
  assignments: AssignmentState[];
  pendingComposition: PendingComposition | null;
  compositions: Array<{
    teamId: string;
    segments: AssembledSegment[];
    source: "ai" | "deterministic_fallback";
  }>;
  judging: JudgeScore[] | null;
  scoring: TeamRoundScore[] | null;
  reveal: { teamIndex: number; segmentIndex: number };
  votes: Array<{ playerId: string; teamId: string }>;
  reactions: Array<{ playerId: string; emoji: string }>;
};

export type RoomState = {
  id: string;
  code: string;
  hostId: string;
  status: "lobby" | "in_progress" | "ended";
  paused: boolean;
  pauseStartedAt: number | null;
  contentMode: "work_safe";
  /** The prompt id the next round will use, chosen at random when the previous
   * round ended (or at room creation) so rounds never play back in a fixed order. */
  nextPromptId: string;
  teams: TeamState[];
  players: PlayerState[];
  rounds: RoundState[];
};

export function currentRound(room: RoomState): RoundState | undefined {
  return room.rounds.at(-1);
}
