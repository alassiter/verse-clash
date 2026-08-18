import { PlayerShell } from "@/components/PlayerShell";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <PlayerShell roomCode={code.toUpperCase()} />;
}
