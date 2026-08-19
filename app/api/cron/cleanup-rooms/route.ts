import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Vercel Cron (see vercel.json) hits this once a day in production to keep
// the rooms table from growing without bound — the in-memory store got this
// for free via process restarts, but Postgres storage does not.
const ROOM_MAX_AGE_HOURS = 24;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: true, deleted: 0, note: "Supabase not configured" });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const cutoff = new Date(Date.now() - ROOM_MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();
  const { error, count } = await supabase
    .from("rooms")
    .delete({ count: "exact" })
    .lt("updated_at", cutoff);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: count ?? 0 });
}
