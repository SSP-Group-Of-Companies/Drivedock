export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Tabs skeleton */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-8 w-28 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>

      {/* Operation bar skeleton */}
      <div className="h-16 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-900/60" />

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="h-10 animate-pulse border-b border-zinc-200 bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-900/60" />
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse border-b border-zinc-200 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-950"
          />
        ))}
      </div>
    </div>
  );
}
