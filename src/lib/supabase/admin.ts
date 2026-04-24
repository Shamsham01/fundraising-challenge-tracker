import { createClient } from "@supabase/supabase-js";
import { getClientEnv, getServerEnv, type ServerEnv } from "@/lib/env";

export function getSupabaseServiceRole() {
  const e = getServerEnv() as ServerEnv;
  if (!e.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (required for this operation).");
  }
  const c = getClientEnv();
  return createClient(c.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
