"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function HomeLeaderboardChallengeSelect(props: {
  options: { slug: string; title: string }[];
  currentSlug: string | null;
}) {
  const router = useRouter();
  const value = props.currentSlug ?? "__all__";
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v === "__all__") {
          router.push("/");
        } else if (typeof v === "string") {
          router.push(`/?challenge=${encodeURIComponent(v)}`);
        }
      }}
    >
      <SelectTrigger className="w-full max-w-md">
        <SelectValue placeholder="Choose a challenge" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All challenges (combined distance)</SelectItem>
        {props.options.map((o) => (
          <SelectItem key={o.slug} value={o.slug}>
            {o.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
