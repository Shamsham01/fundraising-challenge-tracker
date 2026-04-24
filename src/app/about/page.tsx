import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
      <h1 className="text-2xl font-bold">About</h1>
      <p className="text-muted-foreground">
        Fundraising Challenge Tracker connects Strava activities to transparent, reviewable
        campaign progress. Participants join with a link, connect Strava, and activity is ingested
        via webhooks and scheduled sync. Admins configure rules, moderate activity, and export
        results.
      </p>
      <Link className="text-primary underline" href="/">
        Home
      </Link>
    </main>
  );
}
