import { HostShell } from "@/components/HostShell";

/** Server Actions inherit this; must cover Claude compose + judge. */
export const maxDuration = 60;

export default async function HostPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <HostShell roomCode={code.toUpperCase()} />;
}
