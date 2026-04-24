import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { z } from "zod";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

const q = z.object({
  scope: z.enum(["athlete-avatar", "admin-avatar", "campaign-image"]),
  campaignId: z.string().uuid().optional(),
});

/**
 * Returns a signed upload path for the unified media pipeline.
 * Production: also validate user permissions (campaignId belongs to user if participant upload).
 */
export async function POST(request: NextRequest) {
  const supa = await createSupabaseServerClient();
  const { data: s } = await supa.auth.getUser();
  if (!s.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = q.merge(z.object({ contentType: z.string() })).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { scope, contentType, campaignId } = parsed.data;
  if (scope === "campaign-image" && !campaignId) {
    return NextResponse.json(
      { error: "campaignId required for campaign-image" },
      { status: 400 },
    );
  }
  if (scope === "campaign-image" && campaignId) {
    if (s.user.app_metadata?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
  if (scope === "admin-avatar" && s.user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!allowed.has(contentType)) {
    return NextResponse.json({ error: "content type" }, { status: 400 });
  }
  const ext =
    contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/png"
        ? "png"
        : "webp";
  const admin = getSupabaseServiceRole();
  const path =
    scope === "athlete-avatar" || scope === "admin-avatar"
      ? `${s.user.id}/${Date.now()}.${ext}`
      : `campaigns/${campaignId ?? "unknown"}/${Date.now()}.${ext}`;
  const bucket =
    scope === "athlete-avatar"
      ? "athlete-avatars"
      : scope === "admin-avatar"
        ? "admin-avatars"
        : "campaign-images";
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    bucket,
    path,
    token: (data as { token?: string }).token,
    signedUrl: (data as { signedUrl: string }).signedUrl,
  });
}

export async function GET(request: NextRequest) {
  void request;
  return NextResponse.json({
    maxBytes: MAX_BYTES,
    allowed: [...allowed],
  });
}
