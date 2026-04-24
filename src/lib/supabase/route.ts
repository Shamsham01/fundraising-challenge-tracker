import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getClientEnv } from "@/lib/env";
import type { CookieOptions } from "@supabase/ssr";

/**
 * Use in route handlers and server actions that update auth cookies.
 */
export async function createSupabaseRouteClient() {
  const env = getClientEnv();
  const store = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(
          list: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            list.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            );
          } catch {
            // Server Component: ignore
          }
        },
      },
    },
  );
}
