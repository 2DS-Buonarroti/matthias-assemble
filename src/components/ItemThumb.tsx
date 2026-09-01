import { Shirt } from "lucide-react";

import { cn } from "@/lib/utils";

export function ItemThumb({
  url,
  name,
  className,
}: {
  url?: string | undefined;
  name: string;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted", className)}>
      {url ? (
        <img src={url} alt={name} loading="lazy" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <Shirt className="size-6" />
        </div>
      )}
    </div>
  );
}
