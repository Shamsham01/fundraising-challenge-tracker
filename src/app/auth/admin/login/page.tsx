"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminLoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supa = createSupabaseBrowserClient();
    const { error } = await supa.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    r.replace("/admin");
  }
  async function magic() {
    setLoading(true);
    const supa = createSupabaseBrowserClient();
    const { error } = await supa.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + "/admin" } });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for the magic link.");
  }
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
      <h1 className="text-xl font-bold">Admin sign in</h1>
      <p className="text-sm text-muted-foreground">
        Use Supabase email/password or magic link. The user must have{" "}
        <code className="rounded bg-muted px-1">app_metadata.role = admin</code> (set via service role
        or SQL).
      </p>
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Participants:</strong> Strava users must be informed that
        challenge leaderboards and campaign features use in-app, consent-based display of
        campaign-derived stats—not raw Strava feeds for other athletes. See{" "}
        <Link className="text-primary underline" href="/privacy">
          privacy &amp; leaderboards
        </Link>
        .
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" disabled={loading}>
          Sign in
        </Button>
      </form>
      <Button type="button" variant="secondary" disabled={loading || !email} onClick={magic}>
        Email magic link
      </Button>
    </main>
  );
}
