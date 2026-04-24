/**
 * Local/test: call cron endpoint (set CRON_SECRET and NEXT_PUBLIC_APP_URL in env).
 *   node scripts/cron-reconcile.mjs
 */
const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("Set CRON_SECRET");
  process.exit(1);
}
const u = new URL("/api/cron/reconcile", base);
u.searchParams.set("secret", secret);
const res = await fetch(u);
const j = await res.json();
console.log(res.status, j);
process.exit(res.ok ? 0 : 1);
