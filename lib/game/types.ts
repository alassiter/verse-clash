import type { AssembledSegment } from "@/lib/content";

export type Actor = { id: string };

export type Phase =
  | "gathering"
  | "prompt_reveal"
  | "selecting"
  | "reveal"
  | "voting"
  | "standings"
  | "ended";

export type TeammateView = {
  id: string;
  displayName: string;
  submitted?: boolean;
  options?: { id: string; text: string }[];
  selectedText?: string;
};

export type ChatMessageView = {
  playerName: string;
  body: string;
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
  teamChat: ChatMessageView[];
  teamChatPrimary?: boolean;
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
  standings?: { teamId: string; teamName: string; wins: number }[];
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
  ) => Promise<{ roomCode: string; url: string }>;
  joinRoom: (actor: Actor, input: { code: string; displayName: string }) => Promise<void>;
  getPlayerView: (actor: Actor, roomCode: string) => Promise<PlayerView>;
  getHostView: (actor: Actor, roomCode: string) => Promise<HostView>;
  heartbeat: (actor: Actor, roomCode: string) => Promise<void>;
  setReady: (actor: Actor, roomCode: string, ready: boolean) => Promise<void>;
  shuffleTeams: (actor: Actor, roomCode: string) => Promise<void>;
  movePlayer: (
    actor: Actor,
    roomCode: string,
    playerId: string,
    teamId: string | null,
  ) => Promise<void>;
  startRound: (actor: Actor, roomCode: string) => Promise<void>;
  submitChoice: (actor: Actor, roomCode: string, optionId: string) => Promise<void>;
  sendTeamMessage: (actor: Actor, roomCode: string, body: string) => Promise<void>;
  sendTeamEmoji: (actor: Actor, roomCode: string, emoji: string) => Promise<void>;
  pause: (actor: Actor, roomCode: string) => Promise<void>;
  resume: (actor: Actor, roomCode: string) => Promise<void>;
  endRound: (actor: Actor, roomCode: string) => Promise<void>;
  sendRevealReaction: (actor: Actor, roomCode: string, emoji: string) => Promise<void>;
  vote: (actor: Actor, roomCode: string, teamId: string) => Promise<void>;
  startNextRound: (actor: Actor, roomCode: string) => Promise<void>;
  endGame: (actor: Actor, roomCode: string) => Promise<void>;
};

export type Clock = { now: () => number };

export type RoomCommandDeps = {
  pack: import("@/lib/content").ContentPack;
  clock: Clock;
  random: () => number;
  roomUrl: (code: string) => string;
  store: import("@/lib/game/room-store").RoomStore;
};
