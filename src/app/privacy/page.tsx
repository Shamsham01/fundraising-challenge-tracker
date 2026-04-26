import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function PrivacyPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-12">
        <h1 className="font-story text-3xl font-semibold tracking-tight">Privacy &amp; data</h1>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">What we collect</h2>
          <p>
            This app stores the minimum data needed to run fundraising challenges: your Strava-linked
            identity in our database, tokens to sync activities you choose to connect, campaign
            participation, and derived metrics (for example distance included in a challenge after
            review rules). We do not sell your data.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">Leaderboards &amp; Strava</h2>
          <p>
            Strava’s API terms restrict how athlete data can be shown. In line with that, this app
            does <strong className="text-foreground">not</strong> expose other people’s private Strava
            activity feeds on the public site. Public leaderboards only show:
          </p>
          <ul className="list-inside list-disc space-y-1 pl-1">
            <li>
              <strong className="text-foreground">Challenge-derived totals</strong> you earned under our
              rules (e.g. approved distance included in a campaign), stored in this application.
            </li>
            <li>
              <strong className="text-foreground">Display name and profile photo</strong> from your
              profile here, if you <strong className="text-foreground">opt in</strong> to &quot;public
              leaderboards&quot; in Settings → Profile. If you do not opt in, you are not shown on
              public boards (your scores may still be kept for your own account and admin use).
            </li>
          </ul>
          <p>We do not list raw third-party Strava activity payloads on the public site.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">Your choices</h2>
          <p>
            You can disconnect Strava, update consent checkboxes, and request account deletion
            (including revoking access and removing your participant data) via{" "}
            <Link href="/settings/privacy" className="text-primary underline">
              Settings → Privacy
            </Link>{" "}
            and the in-app options described there. Campaign organisers and administrators may
            export aggregated challenge data as needed for the event; that is subject to the same
            Strava and privacy constraints above.
          </p>
        </section>

        <p className="text-xs text-muted-foreground">
          Configure Supabase Row Level Security, retention, and DPA in line with your organisation’s
          requirements. This text is not legal advice.
        </p>
      </main>
    </div>
  );
}
