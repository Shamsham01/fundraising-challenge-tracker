import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AuditPage() {
  const supa = await createSupabaseServerClient();
  const { data: rows } = await supa
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Audit log</h1>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Meta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).map((r) => (
              <TableRow key={r.id as number}>
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(r.created_at as string).toLocaleString()}
                </TableCell>
                <TableCell className="text-xs">{r.action as string}</TableCell>
                <TableCell className="text-xs">
                  {(r.entity as string) + (r.entity_id ? ` / ${r.entity_id}` : "")}
                </TableCell>
                <TableCell className="max-w-md truncate text-xs">
                  {JSON.stringify(r.metadata)}
                </TableCell>
              </TableRow>
            ))}
            {!rows?.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  No entries yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
