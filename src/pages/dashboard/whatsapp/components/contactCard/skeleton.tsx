import { Skeleton } from "@/components/ui/skeleton";

export const ContactCardSkeleton = () => (
  <div className="border-border w-full border-b border-l-2 border-l-transparent px-4 py-3">
    <div className="flex items-start gap-3">
      <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-1">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-4 w-10 rounded-full" />
        </div>
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  </div>
);
