# Implementation notes (MVP+)

## Done in this release

- Strava OAuth bridge to Supabase email/password (synthetic `strava+{athleteId}@…` + HMAC password).
- **Webhooks**: athlete deauthorization (`updates.authorized === "false"`), activity `delete` events, create/update; optional `STRAVA_WEBHOOK_HMAC_SECRET` with `X-Strava-Signature` when your proxy sets it. Raw body verification.
- **404 / deleted activities**: `getActivityOrNull` removes local row and recomputes.
- **Cron**: throttled with `STRAVA_CRON_INTER_USER_MS` between users; `npm run cron:reconcile` and Netlify `netlify/functions/scheduled-reconcile.mjs` (configure schedule + env in Netlify).
- **Deauth** pipeline: `markStravaDeauthorized`, `disconnectStravaForCurrentUser`, Strava `POST /oauth/deauthorize` before local clear.
- **Storage SQL**: `20260425220000_storage_policies.sql` (public read + per-user + admin write for campaign images).
- **Media**: `MediaUploader` (avatar, admin avatar, campaign image), `POST /api/upload/media` with size/type checks, admin scoping, old object cleanup in server actions.
- **Profile**: consent checkbox; `/settings/privacy` + `deleteMyParticipantAccount` (Strava revoke, storage, `auth.admin.deleteUser`).
- **Admin**: campaign list, edit page (image, featured, recompute), `/admin/profile` (avatar + bio).
- **JustGiving**: `getJustGivingAdapter` fetches a documented example path; adjust to your real API contract.
- Unit tests (eligibility, leaderboard) via `npm test`.

## Remaining production hardening

- **Strava** rate limit headers: backoff in cron when `429` (not implemented yet).
- **Next.js 16**: migrate from `middleware` to the new `proxy` convention when you adopt the stable API.
- **IP allowlist** for webhooks at Netlify / edge (optional).
- **justgiving-adapter**: confirm headers and path with your Blackbaud / JustGiving app registration.

## Feature flags (env)

| Variable | Effect |
|----------|--------|
| `NEXT_PUBLIC_STRAVA_OAUTH_MOCK=1` | Skip real Strava OAuth; mock tokens + athlete. |
| `JUSTGIVING_ENABLED` + `NEXT_PUBLIC_JUSTGIVING_ENABLED` | Donation UI + adapter. |

## Credentials checklist

- **Supabase**: project URL, anon, service role; enable Auth email; Storage buckets from migration.  
- **Strava**: client id/secret, redirect URI, webhook verify token, public callback URL.  
- **Netlify**: all env vars; install `@netlify/plugin-nextjs`.  
- **CRON**: single shared secret; never commit.
