"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/store/ui-store";

export function DashboardShell({ children }: { children: ReactNode }): JSX.Element {
  const { sidebarCollapsed } = useUiStore();

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg selection:bg-accent/20">
      <Sidebar />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300 ease-out",
          sidebarCollapsed ? "ml-[72px]" : "ml-0 md:ml-[240px]"
        )}
      >
        <Header />
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
