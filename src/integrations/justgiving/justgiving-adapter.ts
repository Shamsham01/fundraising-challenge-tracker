import { isJustGivingEnabledServer } from "@/lib/env";
import type { DonationProvider } from "./types";

const DEFAULT_BASE = "https://api.justgiving.com";

/**
 * JustGiving (Blackbaud) style REST adapter. Endpoint shapes vary by product region / API version.
 * Set JUSTGIVING_BASE_URL and JUSTGIVING_API_KEY from your account; adjust paths when you
 * receive official docs. `getPageTotal` is best-effort; failures return null (UI stays up).
 */
export function getJustGivingAdapter(): DonationProvider {
  if (!isJustGivingEnabledServer()) {
    return { isEnabled: () => false };
  }
  const key = process.env.JUSTGIVING_API_KEY;
  const base = (process.env.JUSTGIVING_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
  return {
    isEnabled: () => true,
    getPageTotal: async (args: { externalId: string }) => {
      if (!key) {
        return null;
      }
      try {
        // Example: GET {base}/v1/fundraising/pages/{id} — replace with your registered route.
        const url = new URL(
          `${base}/v1/fundraising/pages/${encodeURIComponent(args.externalId)}`,
        );
        const res = await fetch(url, {
          headers: {
            "x-api-key": key,
            accept: "application/json",
            "x-api-version": "1",
          },
          next: { revalidate: 300 },
        });
        if (!res.ok) {
          return null;
        }
        const j = (await res.json()) as {
          totalRaised?: number;
          currencyCode?: string;
          pageUrl?: string;
        };
        const total = j.totalRaised ?? 0;
        return {
          totalRaisedCents: Math.round(total * 100),
          currency: j.currencyCode ?? "GBP",
          pageUrl: j.pageUrl ?? `https://www.justgiving.com/fundraising/${args.externalId}`,
        };
      } catch {
        return null;
      }
    },
  };
}

export function getJustGivingMockAdapter(): DonationProvider {
  return {
    isEnabled: () => true,
    getPageTotal: async () => ({
      totalRaisedCents: 12_50,
      currency: "GBP",
      pageUrl: "https://www.justgiving.com/example",
    }),
  };
}
