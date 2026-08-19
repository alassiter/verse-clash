import { PlayerShell } from "@/components/PlayerShell";

/** Server Actions inherit this; must cover Claude compose + judge. */
export const maxDuration = 60;

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <PlayerShell roomCode={code.toUpperCase()} />;
}
