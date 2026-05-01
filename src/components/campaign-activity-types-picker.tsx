"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  STRAVA_ACTIVITY_TYPE_PRESETS,
  STRAVA_SPORT_TYPES,
} from "@/domain/strava-sport-types";
import { Search } from "lucide-react";

type Props = {
  /** Name of the hidden input posted as a JSON string array. */
  fieldName: string;
  defaultSelected: string[];
  idPrefix?: string;
};

export function CampaignActivityTypesPicker({
  fieldName,
  defaultSelected,
  idPrefix = "act-type",
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(defaultSelected));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...STRAVA_SPORT_TYPES];
    return STRAVA_SPORT_TYPES.filter((t) => t.toLowerCase().includes(q));
  }, [query]);

  const jsonValue = useMemo(
    () => JSON.stringify([...selected].sort()),
    [selected],
  );

  function toggle(type: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(type);
      else next.delete(type);
      return next;
    });
  }

  function applyPreset(types: readonly string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const t of types) next.add(t);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={fieldName} value={jsonValue} readOnly />
      <div>
        <Label className="text-muted-foreground">Quick add</Label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {STRAVA_ACTIVITY_TYPE_PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={() => applyPreset(p.types)}
            >
              + {p.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={`${idPrefix}-search`}
          className="pl-9"
          placeholder="Filter by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>
      <ScrollArea className="h-60 rounded-md border bg-background">
        <ul className="space-y-0.5 p-2 pr-4">
          {filtered.map((t) => (
            <li key={t}>
              <label
                htmlFor={`${idPrefix}-${t}`}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/80"
              >
                <Checkbox
                  id={`${idPrefix}-${t}`}
                  checked={selected.has(t)}
                  onCheckedChange={(v) => toggle(t, v === true)}
                />
                <span className="font-mono text-xs">{t}</span>
              </label>
            </li>
          ))}
        </ul>
      </ScrollArea>
      <p className="text-xs text-muted-foreground">
        {selected.size} type{selected.size === 1 ? "" : "s"} selected — must match
        Strava’s activity type for an upload to count.
      </p>
    </div>
  );
}
