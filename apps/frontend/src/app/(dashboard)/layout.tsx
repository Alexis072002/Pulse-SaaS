import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }): JSX.Element {
  const jwtCookie = cookies().get("pulse_access_token")?.value;
  if (!jwtCookie) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-bg md:flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        {children}
      </div>
    </div>
  );
}
