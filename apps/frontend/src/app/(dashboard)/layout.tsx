import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }: { children: ReactNode }): JSX.Element {
  const jwtCookie = cookies().get("pulse_access_token")?.value;
  if (!jwtCookie) {
    redirect("/login");
  }

  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  );
}
