# Fundraising Challenge Tracker (MVP+)

Next.js 16, Supabase, Strava, optional JustGiving. Run locally with mock Strava if you have no API keys.

## Quick start

```bash
cd fundraising-challenge-tracker
cp .env.example .env.local
# fill at least NEXT_PUBLIC_SUPABASE_*, Supabase service role, STRAVA_OAUTH_DERIVE_SECRET (32+ chars)
# For zero Strava: keep NEXT_PUBLIC_STRAVA_OAUTH_MOCK=1 and STRAVA_OAUTH_MOCK=1
npm install
npm run dev
```

Apply SQL migrations in `supabase/migrations/` in order (initial schema, then `20260425220000_storage_policies.sql` for storage RLS) in the Supabase SQL editor (or `supabase db push` with CLI).

**Admin user**

1. Create a user in Supabase Auth (email) or use magic link.
2. In SQL: `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}' where id = 'UUID';`
3. Insert `public.users` and `public.admin_profiles` for that `id` (see `supabase/seed.sql` comments).

**Strava production TODO**

- Create Strava app; set redirect URI to `https://<host>/api/auth/strava/callback`.
- Set `strava+{id}@` domain: use a **dedicated** DNS/domain you control for `STRAVA_PARTICIPANT_EMAIL_DOMAIN` (and allow in Supabase Auth if required).
- Register webhook to `https://<host>/api/webhooks/strava` with the same `STRAVA_WEBHOOK_VERIFY_TOKEN`.
- Set `CRON_SECRET` and schedule Netlify (or other) to `GET /api/cron/reconcile?secret=...` every 6–24h.

**JustGiving**

- Set `JUSTGIVING_ENABLED=1`, `JUSTGIVING_API_KEY`, `NEXT_PUBLIC_JUSTGIVING_ENABLED=1` when you wire `src/integrations/justgiving/justgiving-adapter.ts`.

## Scripts

- `npm run dev` — dev server  
- `npm run build` — production build  
- `npm test` — Vitest (eligibility, leaderboard)  
- `node scripts/seed.mjs` — optional campaign insert (needs service key)  
- `npm run cron:reconcile` — calls `GET /api/cron/reconcile?secret=…` (set `CRON_SECRET` and `NEXT_PUBLIC_APP_URL`)  

Scheduled reconcile on Netlify: deploy `netlify/functions/scheduled-reconcile.mjs` and set `URL` (or `DEPLOY_PRIME_URL`) and `CRON_SECRET` in the same environment the Next app uses.

## Layout (main paths)

| Path | Purpose |
|------|---------|
| `src/app` | App Router: public site, dashboard, admin, API routes |
| `src/components` | UI (shadcn), `site-header`, `campaign-card` |
| `src/domain` | Pure rules: eligibility, objectives, leaderboard, moderation |
| `src/integrations/strava` | API client, mock, webhooks (handler in `app/api`) |
| `src/integrations/justgiving` | Adapter + feature flag |
| `src/lib` | Env (Zod), Supabase clients, Strava activity pipeline, storage URL helpers |
| `supabase/migrations` | Initial schema + RLS |
| `docs/ARCHITECTURE.md` | Diagrams and integration notes |

## Netlify

Install `@netlify/plugin-nextjs` and use `netlify.toml` as a starting point. Set all `NEXT_PUBLIC_*` and server secrets in the Netlify UI. Schedule the reconcile URL with `CRON_SECRET`.

## Tests

`src/domain/__tests__` covers window/type eligibility and ranking tie-break. Extend with more cases as you harden.

## License

Private / your terms.
