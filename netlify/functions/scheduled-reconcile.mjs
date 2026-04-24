/**
 * Netlify scheduled function — set schedule in this file or Netlify UI.
 * Required env in Netlify: URL (site URL), CRON_SECRET (same as app).
 *
 * @type {{ schedule: string }}
 */
export const config = {
  schedule: "0 */4 * * *",
};

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.warn("scheduled-reconcile: missing URL or CRON_SECRET");
    return;
  }
  const u = new URL("/api/cron/reconcile", base);
  u.searchParams.set("secret", secret);
  const res = await fetch(u);
  const text = await res.text();
  console.log("reconcile", res.status, text);
};
