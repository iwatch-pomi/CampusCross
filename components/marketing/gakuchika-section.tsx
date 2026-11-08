import { BookOpenCheck, Check, Mic } from "lucide-react";
import { SectionHeading } from "@/components/ui";
import { GAKUCHIKA } from "@/lib/content";

/** 「ガクチカ」への寄り添い：教える人／学ぶ人それぞれへのメッセージ */
export function GakuchikaSection() {
  const columns = [
    { ...GAKUCHIKA.forTeachers, icon: Mic, tone: "bg-accent-soft text-accent" },
    { ...GAKUCHIKA.forLearners, icon: BookOpenCheck, tone: "bg-primary-soft text-primary" },
  ];
  return (
    <div>
      <SectionHeading label={GAKUCHIKA.label} title={GAKUCHIKA.title} sub={GAKUCHIKA.sub} align="center" />
      <div className="grid gap-5 md:grid-cols-2">
        {columns.map(({ title, catch: catchcopy, points, icon: Icon, tone }) => (
          <section key={title} className="rounded-lg border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span aria-hidden className={`flex size-12 shrink-0 items-center justify-center rounded-full ${tone}`}>
                <Icon className="size-6" strokeWidth={1.75} />
              </span>
              <h3 className="text-sm text-text-sub">{title}</h3>
            </div>
            <p className="mt-3 text-lg font-bold leading-snug">{catchcopy}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {points.map((p) => (
                <li key={p} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-text-sub">{GAKUCHIKA.note}</p>
    </div>
  );
}
