/** 3ステップ（番号を大きく） */
export function Steps({ items }: { items: readonly { title: string; body: string }[] }) {
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {items.map((s, i) => (
        <li key={s.title} className="flex gap-4 rounded-lg bg-surface p-5 shadow-card md:flex-col md:gap-2">
          <span aria-hidden className="text-4xl font-bold leading-none text-primary-vivid">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="text-base">
              <span className="sr-only">ステップ{i + 1}：</span>
              {s.title}
            </h3>
            <p className="mt-1 text-sm text-text-sub">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
