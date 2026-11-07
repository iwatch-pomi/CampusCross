/** 数字だけを大きく・アクセント色で見せる */
export function StatNumbers({ items }: { items: readonly { number: string; unit: string; label: string }[] }) {
  return (
    <dl className="grid grid-cols-3 gap-3 sm:gap-6">
      {items.map((s) => (
        <div key={s.label} className="flex flex-col-reverse items-center rounded-lg bg-surface px-2 py-5 text-center shadow-card">
          <dt className="mt-1 text-xs text-text-sub sm:text-sm">{s.label}</dt>
          <dd className="font-bold text-accent">
            <span className="text-4xl leading-none tracking-tight sm:text-5xl">{s.number}</span>
            <span className="ml-0.5 text-sm sm:text-base">{s.unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
