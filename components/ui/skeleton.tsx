export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-border/60 ${className}`} />;
}

/** チケット型カードの読み込み中表示 */
export function SkillCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <Skeleton className="h-28 rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}
