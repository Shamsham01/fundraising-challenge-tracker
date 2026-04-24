import type { Metadata } from "next";
import { Geist_Mono, Outfit, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const story = Fraunces({
  variable: "--font-story",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HUGS Challenge | Fundraising with Strava",
  description:
    "HUGS Children’s Cancer Charity and the Samworth Charity Challenge — public campaigns, Strava leaderboards, and fundraising support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(outfit.variable, story.variable, geistMono.variable, "h-full antialiased")}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
