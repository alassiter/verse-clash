import type { AssembledSegment, CompositionFill } from "@/lib/content";

export type Actor = { id: string };

export type Phase =
  | "gathering"
  | "prompt_reveal"
  | "selecting"
  | "composing"
  | "reveal"
  | "voting"
  | "standings"
  | "ended";

export type ComposeJudgeInput = {
  roomId: string;
  roundId: string;
  requestId: string;
  templateId: string;
  promptId: string;
  teams: Array<{ teamId: string; fills: CompositionFill[] }>;
};

export type JudgeScore = {
  teamId: string;
  promptBonus: number;
  cohesionBonus: number;
  rationale?: string;
};

export type ComposeJudgeResult = {
  requestId: string;
  compositions: Array<{
    teamId: string;
    segments: AssembledSegment[];
    source: "ai" | "deterministic_fallback";
  }>;
  judging?: JudgeScore[];
};

export type AiComposer = {
  composeAndJudge(input: ComposeJudgeInput): Promise<ComposeJudgeResult>;
};

export type TeammateView = {
  id: string;
  displayName: string;
  submitted?: boolean;
  options?: { id: string; text: string }[];
  selectedText?: string;
};

export type PlayerView = {
  phase: Phase;
  phaseName: string;
  instruction: string;
  roomCode: string;
  displayName: string;
  isHost: boolean;
  paused: boolean;
  isReady: boolean;
  timerEndsAt?: number;
  team: { id: string; name: string; teammates: TeammateView[] } | null;
  teammates: TeammateView[];
  waitingForNextRound?: boolean;
  lobby?: {
    players: Array<{
      displayName: string;
      isHost: boolean;
      teamName: string | null;
      isReady: boolean;
    }>;
  };
  prompt?: { text: string; tease?: string; formatHint: string };
  chaosCard?: { id: string; name: string; description: string };
  /** True when this player is the only active member of their team this round,
   * so the game auto-picked real words for the rest of their team's slots. */
  soloAutoFill?: boolean;
  /** The team's words in the exact order they're handed to the AI, shown
   * while composing so the team can see what it's about to work with. */
  composingWords?: Array<{ text: string; displayName: string }>;
  selection?: {
    playerLabel: string;
    options: { id: string; text: string }[];
    submitted: boolean;
    selectedOptionId?: string;
  };
  reveal?: {
    teamName: string;
    composition: AssembledSegment[];
    visibleSegments: AssembledSegment[];
    attribution?: string;
    bursts: { emoji: string }[];
  };
  voting?: { teams: { id: string; name: string }[] };
  /** True once regulation rounds ended in a tie and the game moved into
   * sudden-death rounds to break it. */
  isTiebreaker?: boolean;
  standings?: Array<{
    teamId: string;
    teamName: string;
    totalScore: number;
    roundsWon: number;
    lastRound?: import("@/lib/scoring/combos").TeamRoundScore;
    lastComposition?: AssembledSegment[];
  }>;
  /** The single highest-scoring team-verse across the whole game, shown on
   * the final "ended" screen. */
  bestVerse?: {
    promptText: string;
    teamName: string;
    segments: AssembledSegment[];
    score: number;
  };
  /** The team(s) with the highest cumulative score once the game ends —
   * more than one name means a tie. */
  winner?: { teamNames: string[]; totalScore: number };
  globalChat?: undefined;
  individualScores?: undefined;
  template?: undefined;
};

export type HostView = PlayerView & {
  players: Array<{
    id: string;
    displayName: string;
    teamName: string | null;
    isReady: boolean;
    lastSeenAt: number;
    disconnected: boolean;
    isHost: boolean;
  }>;
  teams: Array<{ id: string; name: string }>;
  promptPreview?: {
    text: string;
    formatHint: string;
    wordPools: Array<{ label: string; samples: string[] }>;
  };
};

export type RoomCommands = {
  createRoom: (
    actor: Actor,
    input: { displayName: string },
  ) => { roomCode: string; url: string };
  joinRoom: (actor: Actor, input: { code: string; displayName: string }) => void;
  getPlayerView: (actor: Actor, roomCode: string) => PlayerView;
  getHostView: (actor: Actor, roomCode: string) => HostView;
  heartbeat: (actor: Actor, roomCode: string) => void;
  setReady: (actor: Actor, roomCode: string, ready: boolean) => void;
  shuffleTeams: (actor: Actor, roomCode: string) => void;
  movePlayer: (
    actor: Actor,
    roomCode: string,
    playerId: string,
    teamId: string | null,
  ) => void;
  startRound: (actor: Actor, roomCode: string) => void;
  submitChoice: (actor: Actor, roomCode: string, optionId: string) => void;
  pause: (actor: Actor, roomCode: string) => void;
  resume: (actor: Actor, roomCode: string) => void;
  endRound: (actor: Actor, roomCode: string) => void;
  sendRevealReaction: (actor: Actor, roomCode: string, emoji: string) => void;
  vote: (actor: Actor, roomCode: string, teamId: string) => void;
  startNextRound: (actor: Actor, roomCode: string) => void;
  endGame: (actor: Actor, roomCode: string) => void;
};

export type Clock = { now: () => number };

export type RoomCommandDeps = {
  pack: import("@/lib/content").ContentPack;
  clock: Clock;
  random: () => number;
  roomUrl: (code: string) => string;
  ai?: AiComposer;
  /** Fire-and-forget hook piggybacked on the client heartbeat poll — used to
   * periodically refresh the AI-generated prompt pool without a scheduler. */
  onHeartbeat?: () => void;
};
