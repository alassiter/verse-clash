import { AnimatedLogo } from "@/components/AnimatedLogo";
import { BackgroundMusic } from "@/components/BackgroundMusic";
import { HomeForm } from "@/components/HomeForm";

/** Server Actions inherit this; must cover Claude compose + judge. */
export const maxDuration = 60;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-4">
      <BackgroundMusic />
      <div className="flex flex-col items-center text-center">
        <AnimatedLogo />
      </div>
      <HomeForm />
      <p className="mt-8 text-center text-lg text-stone-600"></p>
    </main>
  );
}
