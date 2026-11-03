import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Sign out failed:", error);
  }
  return NextResponse.json({ signedOut: true }, { headers: { "Cache-Control": "no-store" } });
}