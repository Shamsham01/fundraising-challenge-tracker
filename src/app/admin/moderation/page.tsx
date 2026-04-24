import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { reviewActivity } from "@/app/actions/moderation";

export default async function ModerationPage() {
  const supa = await createSupabaseServerClient();
  const { data: rows } = await supa
    .from("activity_reviews")
    .select("id, status, activity_id, campaign_id, activities(name, sport_type), campaigns(title)")
    .eq("status", "pending")
    .limit(50);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Moderation queue</h1>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).map((r) => {
              const actRaw = r.activities as
                | { name: string | null; sport_type: string }
                | { name: string | null; sport_type: string }[]
                | null;
              const act = Array.isArray(actRaw) ? actRaw[0] : actRaw;
              const campRaw = r.campaigns as { title: string } | { title: string }[] | null;
              const camp = Array.isArray(campRaw) ? campRaw[0] : campRaw;
              return (
                <TableRow key={r.id as string}>
                  <TableCell>{camp?.title}</TableCell>
                  <TableCell>
                    {act?.name} ({act?.sport_type})
                  </TableCell>
                  <TableCell>
                    <Badge>{r.status as string}</Badge>
                  </TableCell>
                  <TableCell className="flex flex-wrap gap-1">
                    <form action={reviewActivity}>
                      <input type="hidden" name="id" value={r.id as string} />
                      <input type="hidden" name="status" value="approved" />
                      <button className="rounded border px-2 py-1 text-xs" type="submit">
                        Approve
                      </button>
                    </form>
                    <form action={reviewActivity}>
                      <input type="hidden" name="id" value={r.id as string} />
                      <input type="hidden" name="status" value="rejected" />
                      <button className="rounded border px-2 py-1 text-xs" type="submit">
                        Reject
                      </button>
                    </form>
                    <form action={reviewActivity}>
                      <input type="hidden" name="id" value={r.id as string} />
                      <input type="hidden" name="status" value="flagged" />
                      <button className="rounded border px-2 py-1 text-xs" type="submit">
                        Flag
                      </button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
            {!rows?.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  No pending items.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
