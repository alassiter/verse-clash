import { HostShell } from "@/components/HostShell";

export default async function HostPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <HostShell roomCode={code.toUpperCase()} />;
}
