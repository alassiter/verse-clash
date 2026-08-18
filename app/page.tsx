import { AnimatedLogo } from "@/components/AnimatedLogo";
import { HomeForm } from "@/components/HomeForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-4">
      <div className="flex flex-col items-center text-center">
        <AnimatedLogo />
      </div>
      <HomeForm />
      <p className="mt-8 text-center text-lg text-stone-600"></p>
    </main>
  );
}
