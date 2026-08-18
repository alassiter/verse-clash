import { cookies } from "next/headers";

export const ACTOR_COOKIE = "verse_clash_actor";

export async function getOrCreateActorId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(ACTOR_COOKIE)?.value;
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  store.set(ACTOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}

export async function actorFromCookies(): Promise<{ id: string }> {
  return { id: await getOrCreateActorId() };
}
