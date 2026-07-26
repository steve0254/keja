import { useRouterState } from "@tanstack/react-router";

export function TopProgressBar() {
  const isTransitioning = useRouterState({ select: (s) => s.isTransitioning });

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[1500] h-[3px] overflow-hidden transition-opacity duration-200 ${
        isTransitioning ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="h-full w-full bg-primary/15">
        <div className="h-full w-1/3 rounded-r-full bg-primary animate-progress-indeterminate" />
      </div>
    </div>
  );
}
