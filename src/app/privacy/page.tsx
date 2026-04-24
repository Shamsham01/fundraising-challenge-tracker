export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
      <h1 className="text-2xl font-bold">Privacy</h1>
      <p className="text-muted-foreground">
        This MVP stores the minimum Strava data required to attribute activities to your account and
        display public challenge results. You can request deletion by revoking Strava access and
        contacting the campaign organiser. Configure Supabase Row Level Security and retention
        policies for your deployment.
      </p>
    </main>
  );
}
