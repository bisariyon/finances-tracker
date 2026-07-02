import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-white/5 rounded-xl" />
          <Skeleton className="h-4 w-32 bg-white/5 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-28 bg-white/5 rounded-full" />
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-28 w-full bg-white/5 rounded-2xl" />
        <Skeleton className="h-28 w-full bg-white/5 rounded-2xl" />
        <Skeleton className="h-28 w-full bg-white/5 rounded-2xl" />
      </div>

      {/* Table / Details Area Skeleton */}
      <div className="rounded-2xl border border-white/5 bg-white/2 p-6 space-y-4">
        <Skeleton className="h-6 w-1/4 bg-white/5 rounded-lg" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-10 w-full bg-white/5 rounded-xl" />
          <Skeleton className="h-10 w-full bg-white/5 rounded-xl" />
          <Skeleton className="h-10 w-full bg-white/5 rounded-xl" />
          <Skeleton className="h-10 w-full bg-white/5 rounded-xl" />
          <Skeleton className="h-10 w-full bg-white/5 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
