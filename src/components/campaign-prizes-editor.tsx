"use client";

import { useMemo, useState } from "react";
import { setCampaignPrizes } from "@/app/actions/campaign-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { CampaignPrize } from "@/lib/campaign-leaderboard";

type Row = { placement: number; title: string; description: string };

function nextPlacement(rows: Row[]): number {
  if (rows.length === 0) {
    return 1;
  }
  return Math.max(...rows.map((r) => r.placement), 0) + 1;
}

export function CampaignPrizesEditor(props: {
  campaignId: string;
  initialPrizes: CampaignPrize[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    props.initialPrizes.length
      ? props.initialPrizes.map((p) => ({
          placement: p.placement,
          title: p.title,
          description: p.description ?? "",
        }))
      : [],
  );
  const jsonPayload = useMemo(
    () =>
      JSON.stringify(
        rows.map((r) => ({
          placement: r.placement,
          title: r.title,
          description: r.description.trim() || null,
        })),
      ),
    [rows],
  );

  return (
    <form
      className="max-w-2xl space-y-3 border-t pt-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (rows.some((r) => !r.title.trim())) {
          return;
        }
        const fd = new FormData();
        fd.set("campaignId", props.campaignId);
        fd.set("prizes", jsonPayload);
        const res = await setCampaignPrizes(fd);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Prizes saved");
        router.refresh();
      }}
    >
      <h2 className="text-lg font-semibold">Prizes for this challenge</h2>
      <p className="text-sm text-muted-foreground">
        Add as many as you need. <strong>Placement</strong> is the leaderboard rank (1 = 1st place).
        These appear next to the leaderboard for this campaign and on the home page when the challenge
        is selected.
      </p>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div
            key={`${r.placement}-${i}`}
            className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[80px_1fr_1fr_auto]"
          >
            <div>
              <Label className="text-xs">Rank</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={r.placement}
                onChange={(e) => {
                  const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                  setRows((prev) => {
                    const next = [...prev];
                    next[i] = { ...next[i]!, placement: n };
                    return next;
                  });
                }}
                className="tabular-nums"
              />
            </div>
            <div>
              <Label className="text-xs">Prize</Label>
              <Input
                value={r.title}
                onChange={(e) => {
                  const v = e.target.value;
                  setRows((prev) => {
                    const next = [...prev];
                    next[i] = { ...next[i]!, title: v };
                    return next;
                  });
                }}
                placeholder="e.g. £50 voucher"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Textarea
                rows={2}
                value={r.description}
                onChange={(e) => {
                  const v = e.target.value;
                  setRows((prev) => {
                    const next = [...prev];
                    next[i] = { ...next[i]!, description: v };
                    return next;
                  });
                }}
                placeholder="Details shown on hover or small text"
                className="min-h-0"
              />
            </div>
            <div className="flex items-end sm:pb-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Remove prize"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              { placement: nextPlacement(prev), title: "", description: "" },
            ])
          }
        >
          <Plus className="mr-1 size-4" />
          Add prize
        </Button>
        <Button type="submit" size="sm" disabled={rows.some((r) => !r.title.trim())}>
          Save prizes
        </Button>
      </div>
    </form>
  );
}
