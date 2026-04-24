/**
 * Optional Node seed — requires @supabase/supabase-js and env.
 * Most teams prefer SQL in supabase/seed.sql.
 *
 *   node scripts/seed.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const s = createClient(url, key);
const { data, error } = await s.from("campaigns").insert({
  title: "API Seed Campaign",
  slug: "api-seed-campaign",
  description: "Created by scripts/seed.mjs",
  starts_at: new Date().toISOString(),
  ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
  objective: "total_distance",
  review_mode: "auto_approve",
  is_public: true,
}).select("id").single();
if (error) {
  console.error(error);
  process.exit(1);
}
console.log("Created campaign", data);
process.exit(0);
