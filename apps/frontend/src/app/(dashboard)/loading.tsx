export default function DashboardLoading(): JSX.Element {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <div className="skeleton h-10 w-48" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="rounded-2xl border border-border bg-surface/80 p-4">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-4 h-10 w-20" />
            <div className="skeleton mt-4 h-3 w-28" />
          </article>
        ))}
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-surface/80 p-5">
          <div className="skeleton h-5 w-52" />
          <div className="skeleton mt-4 h-[280px] w-full" />
        </div>
        <div className="rounded-2xl border border-border bg-surface/80 p-5">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton mt-4 h-10 w-full" />
          <div className="skeleton mt-2 h-10 w-full" />
          <div className="skeleton mt-2 h-10 w-full" />
        </div>
      </section>
    </main>
  );
}
