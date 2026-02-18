import type { ReactNode } from "react";

export function PageWrapper({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <h1 className="font-syne text-3xl font-extrabold text-text">{title}</h1>
      {children}
    </main>
  );
}
