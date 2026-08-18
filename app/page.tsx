import { HomeForm } from "@/components/HomeForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-4 py-16">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-orange-700">
        Work-safe party game
      </p>
      <h1 className="mb-4 text-6xl font-black tracking-tight">Verse Clash</h1>
      <p className="mb-12 max-w-2xl text-2xl text-stone-600">
        Hidden word choices. One shared reveal. Nobody has to write a joke.
      </p>
      <HomeForm />
    </main>
  );
}
