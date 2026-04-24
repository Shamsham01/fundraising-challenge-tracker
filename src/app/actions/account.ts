"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { deauthorizeStravaAtSource } from "@/integrations/strava/client";
import { isStravaMocked } from "@/lib/env";

export async function disconnectStravaForCurrentUser(): Promise<void> {
  const supa = await createSupabaseServerClient();
  const { data: s } = await supa.auth.getUser();
  if (!s.user) {
    return;
  }
  const admin = getSupabaseServiceRole();
  const { data: sc } = await admin
    .from("strava_connections")
    .select("access_token, refresh_token")
    .eq("user_id", s.user.id)
    .maybeSingle();
  if (sc?.access_token && !isStravaMocked()) {
    try {
      await deauthorizeStravaAtSource(sc.access_token as string);
    } catch {
      // clear locally anyway
    }
  }
  await admin
    .from("strava_connections")
    .update({
      access_token: "",
      refresh_token: "",
      deauthorized_at: new Date().toISOString(),
    })
    .eq("user_id", s.user.id);
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
}

/**
 * Irreversibly delete the current participant and auth user.
 * Admins are blocked; delete admin users only via Supabase dashboard or a separate break-glass flow.
 * Client should call `signOut` and full navigation on success to clear the session.
 */
export async function deleteMyParticipantAccount(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const supa = await createSupabaseServerClient();
  const { data: s } = await supa.auth.getUser();
  if (!s.user) {
    return { ok: false, message: "Not signed in" };
  }
  if (s.user.app_metadata?.role === "admin") {
    return { ok: false, message: "Admin accounts use a different process." };
  }
  const admin = getSupabaseServiceRole();
  const { data: con } = await admin
    .from("strava_connections")
    .select("access_token")
    .eq("user_id", s.user.id)
    .maybeSingle();
  if (con?.access_token && !isStravaMocked()) {
    try {
      await deauthorizeStravaAtSource(con.access_token as string);
    } catch {
      // proceed
    }
  }
  const { data: ap } = await admin
    .from("athlete_profiles")
    .select("avatar_path")
    .eq("user_id", s.user.id)
    .maybeSingle();
  if (ap?.avatar_path) {
    await admin.storage
      .from("athlete-avatars")
      .remove([ap.avatar_path as string]);
  }
  const { error } = await admin.auth.admin.deleteUser(s.user.id);
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
