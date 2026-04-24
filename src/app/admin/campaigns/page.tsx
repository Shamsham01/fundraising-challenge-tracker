import Link from "next/link";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default async function AdminCampaignsListPage() {
  const admin = getSupabaseServiceRole();
  const { data: rows } = await admin
    .from("campaigns")
    .select("id, title, slug, is_featured, starts_at, ends_at, is_archived")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Campaigns</h1>
        <Link className={cn(buttonVariants())} href="/admin/campaigns/new">
          New campaign
        </Link>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).map((r) => (
              <TableRow key={r.id as string}>
                <TableCell>{r.title as string}</TableCell>
                <TableCell className="font-mono text-xs">{r.slug as string}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {format(new Date(r.starts_at as string), "PP")} –{" "}
                  {format(new Date(r.ends_at as string), "PP")}
                </TableCell>
                <TableCell>{(r as { is_featured: boolean }).is_featured ? "Yes" : "—"}</TableCell>
                <TableCell>
                  <Link
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    href={`/admin/campaigns/${r.id as string}/edit`}
                  >
                    Edit
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!rows?.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No campaigns yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
