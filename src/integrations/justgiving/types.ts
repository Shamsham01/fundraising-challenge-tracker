export interface DonationProvider {
  isEnabled: () => boolean;
  getPageTotal?: (args: { externalId: string }) => Promise<{
    totalRaisedCents: number;
    currency: string;
    pageUrl: string;
  } | null>;
}
