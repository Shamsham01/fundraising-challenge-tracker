"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * On ?new=slug, scrolls to the campaign card, shows a toast, and clears the query.
 */
export function NewCampaignHighlight() {
  const sp = useSearchParams();
  const r = useRouter();
  const slug = sp.get("new");
  useEffect(() => {
    if (!slug) return;
    toast.success("Challenge created", { description: "Here’s your new campaign in the list below." });
    const t1 = window.setTimeout(() => {
      const el = document.getElementById(`campaign-card-${slug}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    const t2 = window.setTimeout(() => {
      r.replace("/campaigns", { scroll: false });
    }, 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [slug, r]);
  return null;
}
