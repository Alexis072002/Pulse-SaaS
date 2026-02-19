interface ChartPanelSkeletonProps {
  heightClass?: string;
}

export function ChartPanelSkeleton({ heightClass = "h-[360px]" }: ChartPanelSkeletonProps): JSX.Element {
  return (
    <section className={`glass rounded-2xl p-5 ${heightClass}`}>
      <div className="skeleton h-4 w-40" />
      <div className="mt-2 skeleton h-3 w-64" />
      <div className="mt-6 h-[75%] w-full rounded-xl border border-border bg-surface-2" />
    </section>
  );
}
