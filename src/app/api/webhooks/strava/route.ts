import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv, isStravaMocked } from "@/lib/env";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import {
  fetchAndUpsertStravaActivity,
  recomputeActivityForUserCampaigns,
  markStravaDeauthorized,
  removeActivityByStravaId,
} from "@/lib/strava/activity-pipeline";

/** Strava push subscription — GET challenge verification */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const mode = p.get("hub.mode");
  const token = p.get("hub.verify_token");
  const challenge = p.get("hub.challenge");
  const e = getServerEnv();
  if (isStravaMocked()) {
    return NextResponse.json({ "hub.challenge": challenge });
  }
  if (mode === "subscribe" && token && challenge && token === e.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * If STRAVA_WEBHHOOK_HMAC_SECRET is set and X-Strava-Signature (or your proxy) is present,
 * verify raw body. Strava’s own POST may be unsigned; when no header is present, request is
 * accepted. Set a reverse proxy with HMAC for strict production verification.
 */
function verifyStravaPost(request: NextRequest, rawBody: string): boolean {
  const e = getServerEnv();
  const sec = e.STRAVA_WEBHOOK_HMAC_SECRET;
  if (!sec) return true;
  const header = request.headers.get("x-strava-signature") || request.headers.get("X-Strava-Signature");
  if (!header) return true;
  const h = createHmac("sha1", sec).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(h, "utf8"), Buffer.from(header, "utf8"));
  } catch {
    return false;
  }
}

/** Ingest webhooks; idempotent by idempotency_key. */
export async function POST(request: NextRequest) {
  const supa = getSupabaseServiceRole();
  const raw = await request.text();
  if (!isStravaMocked() && !verifyStravaPost(request, raw)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }
  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }
  const list = (Array.isArray(body) ? body : [body]) as Record<string, unknown>[];
  for (const ev of list) {
    if (!ev || typeof ev !== "object") continue;
    const object_type = String(ev.object_type ?? "");
    const aspect_type = String(ev.aspect_type ?? "");
    const object_id = Number(ev.object_id);
    const owner_id = Number(ev.owner_id);
    const event_time = Number(ev.event_time);
    if (Number.isNaN(object_id) || Number.isNaN(owner_id) || Number.isNaN(event_time)) {
      continue;
    }

    const idempotencyKey = `${object_id}-${object_type}-${aspect_type}-${event_time}`;

    const { error: insErr } = await supa.from("webhook_events").insert({
      strava_object_id: object_id,
      strava_object_type: object_type,
      strava_aspect_type: aspect_type,
      strava_owner_id: owner_id,
      strava_event_time: new Date(event_time * 1000).toISOString(),
      subscription_id: (ev.subscription_id as number) ?? null,
      payload: ev as object,
      idempotency_key: idempotencyKey,
      status: "received",
    });
    if (insErr) {
      if (insErr.code === "23505") {
        continue;
      }
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    if (object_type === "athlete" && aspect_type === "update") {
      const updates = ev.updates as Record<string, string> | undefined;
      if (updates?.authorized === "false") {
        try {
          await markStravaDeauthorized(object_id);
          await supa
            .from("webhook_events")
            .update({ status: "processed" as const, processed_at: new Date().toISOString() })
            .eq("idempotency_key", idempotencyKey);
        } catch (err) {
          await supa
            .from("webhook_events")
            .update({
              status: "failed" as const,
              error_message: err instanceof Error ? err.message : "error",
            })
            .eq("idempotency_key", idempotencyKey);
        }
        continue;
      }
      await supa
        .from("webhook_events")
        .update({ status: "ignored" as const, processed_at: new Date().toISOString() })
        .eq("idempotency_key", idempotencyKey);
      continue;
    }

    if (object_type === "activity" && aspect_type === "delete") {
      const { data: own } = await supa
        .from("athlete_profiles")
        .select("user_id")
        .eq("strava_athlete_id", owner_id)
        .maybeSingle();
      try {
        if (own?.user_id) {
          await removeActivityByStravaId(own.user_id as string, object_id);
        }
        await supa
          .from("webhook_events")
          .update({ status: "processed" as const, processed_at: new Date().toISOString() })
          .eq("idempotency_key", idempotencyKey);
      } catch (err) {
        await supa
          .from("webhook_events")
          .update({
            status: "failed" as const,
            error_message: err instanceof Error ? err.message : "error",
          })
          .eq("idempotency_key", idempotencyKey);
      }
      continue;
    }

    if (object_type === "activity" && (aspect_type === "create" || aspect_type === "update")) {
      const { data: own } = await supa
        .from("athlete_profiles")
        .select("user_id")
        .eq("strava_athlete_id", owner_id)
        .maybeSingle();
      if (!own?.user_id) {
        await supa
          .from("webhook_events")
          .update({ status: "ignored" as const, processed_at: new Date().toISOString() })
          .eq("idempotency_key", idempotencyKey);
        continue;
      }
      try {
        const r = await fetchAndUpsertStravaActivity(own.user_id as string, object_id);
        if (r.kind === "upsert") {
          await recomputeActivityForUserCampaigns(r.activityId);
        }
        await supa
          .from("webhook_events")
          .update({ status: "processed" as const, processed_at: new Date().toISOString() })
          .eq("idempotency_key", idempotencyKey);
      } catch (err) {
        await supa
          .from("webhook_events")
          .update({
            status: "failed" as const,
            error_message: err instanceof Error ? err.message : "error",
          })
          .eq("idempotency_key", idempotencyKey);
      }
      continue;
    }

    await supa
      .from("webhook_events")
      .update({ status: "ignored" as const, processed_at: new Date().toISOString() })
      .eq("idempotency_key", idempotencyKey);
  }
  return NextResponse.json({ ok: true });
}
