import { BackgroundMusic } from "@/components/BackgroundMusic";

export default function HostLayout({ children }: LayoutProps<"/room/[code]/host">) {
  return (
    <>
      <BackgroundMusic />
      {children}
    </>
  );
}
