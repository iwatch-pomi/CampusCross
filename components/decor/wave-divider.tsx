/** セクション間の波型の区切り。fillClass に次のセクションの背景色（fill-bg-section など）を渡す */
export function WaveDivider({ fillClass, flip = false, className = "" }: { fillClass: string; flip?: boolean; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      className={`block h-10 w-full sm:h-16 ${flip ? "rotate-180" : ""} ${className}`}
    >
      <path
        d="M0 48C120 22 240 10 360 18s240 44 360 48 240-26 360-38 240 4 360 22v32H0z"
        className={fillClass}
      />
    </svg>
  );
}
