import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { messageForAuthErrorParam } from "@/lib/auth-error-messages";
import { SiteHeader } from "@/components/site-header";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const p = await searchParams;
  const { title, body } = messageForAuthErrorParam(p.e);
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground text-balance leading-relaxed break-words">{body}</p>
        <Link href="/" className={cn(buttonVariants({ size: "lg" }))}>
          Home
        </Link>
      </main>
    </div>
  );
}
