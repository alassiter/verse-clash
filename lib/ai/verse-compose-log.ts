export type VerseComposeOrigin =
  | "claude"
  | "skipped-no-key"
  | "call-failed"
  | "verify-failed";

export type VerseComposeLogEntry = {
  roomCode: string;
  roundNumber: number;
  teamName: string;
  origin: VerseComposeOrigin;
  flavor?: string;
  reason?: string;
};

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const MAX_REASON_LENGTH = 300;

/**
 * Compact one-line reason from a thrown Anthropic/SDK error: name, HTTP
 * status, error type, request id, and message — whatever is present.
 */
export function formatCallFailedReason(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as {
      name?: string;
      message?: string;
      status?: number;
      type?: string | null;
      requestID?: string | null;
    };
    const parts: string[] = [];
    if (typeof e.name === "string" && e.name !== "Error") parts.push(e.name);
    if (typeof e.status === "number") parts.push(String(e.status));
    if (e.type) parts.push(e.type);
    if (e.requestID) parts.push(`req=${e.requestID}`);
    if (e.message) parts.push(e.message);
    if (parts.length > 0) {
      const reason = oneLine(parts.join(" "));
      return reason.length > MAX_REASON_LENGTH ? `${reason.slice(0, MAX_REASON_LENGTH)}…` : reason;
    }
  }
  return oneLine(String(err));
}

/** One grep-able line: how this Team's Verse was written. */
export function formatVerseComposeLog(entry: VerseComposeLogEntry): string {
  const parts = [
    `[verse-compose] room=${oneLine(entry.roomCode)} round=${entry.roundNumber} team=${oneLine(entry.teamName)} origin=${entry.origin}`,
  ];
  if (entry.origin !== "claude") {
    if (entry.flavor) parts.push(`flavor=${oneLine(entry.flavor)}`);
    if (entry.reason) parts.push(`reason=${oneLine(entry.reason)}`);
  }
  return parts.join(" ");
}

export function logVerseCompose(entry: VerseComposeLogEntry): void {
  const line = formatVerseComposeLog(entry);
  if (entry.origin === "claude") {
    console.info(line);
  } else {
    console.warn(line);
  }
}
