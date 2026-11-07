import { Clock, Shuffle, Ticket, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { cross: Shuffle, clock: Clock, ticket: Ticket };
const TONES = ["bg-primary-soft text-primary", "bg-accent-soft text-accent", "bg-point-soft text-point"];

/** POINT 1/2/3 の3カラム */
export function FeaturePoints({
  items,
}: {
  items: readonly { label: string; title: string; body: string; icon: string }[];
}) {
  return (
    <ol className="grid gap-5 md:grid-cols-3">
      {items.map((f, i) => {
        const Icon = ICONS[f.icon] ?? Ticket;
        return (
          <li key={f.label} className="relative rounded-lg border border-border bg-surface p-6 shadow-card">
            <span className="inline-block rounded-full bg-point px-3 py-0.5 text-xs font-bold tracking-wider text-on-primary">
              {f.label}
            </span>
            <span aria-hidden className={`absolute right-5 top-5 flex size-14 items-center justify-center rounded-full ${TONES[i % TONES.length]}`}>
              <Icon className="size-7" strokeWidth={1.75} />
            </span>
            <h3 className="mt-4 text-lg">{f.title}</h3>
            <p className="mt-2 text-sm text-text-sub">{f.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
