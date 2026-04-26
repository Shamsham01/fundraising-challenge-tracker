import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { campaignImagePublicUrl } from "@/lib/storage/public-url";
import { format } from "date-fns";

export function CampaignCard(props: {
  title: string;
  slug: string;
  description: string | null;
  imagePath: string | null;
  startsAt: string;
  endsAt: string;
  isFeatured?: boolean;
  /** Highlight the card (e.g. just created) */
  isHighlight?: boolean;
}) {
  const img = campaignImagePublicUrl(props.imagePath);
  return (
    <Link
      id={`campaign-card-${props.slug}`}
      href={`/campaigns/${props.slug}`}
      className="block scroll-mt-24"
    >
      <Card
        className={`h-full transition hover:shadow-md ${
          props.isHighlight ? "ring-2 ring-primary ring-offset-2" : ""
        }`}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-slate-100 to-slate-200">
          {img ? (
            <Image
              src={img}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width:768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
              No image
            </div>
          )}
          {props.isFeatured && (
            <div className="absolute left-2 top-2">
              <Badge>Featured</Badge>
            </div>
          )}
        </div>
        <CardHeader>
          <CardTitle className="line-clamp-1">{props.title}</CardTitle>
          <CardDescription>
            {format(new Date(props.startsAt), "MMM d")} –{" "}
            {format(new Date(props.endsAt), "MMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        {props.description && (
          <CardContent>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {props.description}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
