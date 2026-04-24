import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const p = await searchParams;
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
      <h1 className="text-xl font-bold">Sign-in error</h1>
      <p className="text-sm text-muted-foreground break-all">
        {p.e ? decodeURIComponent(p.e) : "Unknown error"}
      </p>
      <Link href="/" className={cn(buttonVariants())}>
        Home
      </Link>
    </main>
  );
}
