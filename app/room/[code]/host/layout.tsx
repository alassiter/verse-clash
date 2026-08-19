import { BackgroundMusic } from "@/components/BackgroundMusic";
import type { ReactNode } from "react";

/** Server Actions inherit this; must cover Claude compose + judge. */
export const maxDuration = 60;

export default function HostLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BackgroundMusic />
      {children}
    </>
  );
}
