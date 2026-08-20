import { BackgroundMusic } from "@/components/BackgroundMusic";
import type { ReactNode } from "react";

export default function HostLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BackgroundMusic />
      {children}
    </>
  );
}
