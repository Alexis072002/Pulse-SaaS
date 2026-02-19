"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/store/ui-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface WorkspaceBadgeInfo {
  name: string;
  role: string;
}

export function DashboardShell({ children }: { children: ReactNode }): JSX.Element {
  const { sidebarCollapsed } = useUiStore();
  const [workspace, setWorkspace] = useState<WorkspaceBadgeInfo | null>(null);

  useEffect(() => {
    let active = true;

    void fetch(`${API_URL}/workspace/context`, {
      credentials: "include"
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        const payload = (await response.json()) as {
          success?: boolean;
          data?: { workspaceName?: string; role?: string };
        };
        if (!payload.success || !payload.data?.workspaceName || !payload.data.role) {
          return null;
        }
        return {
          name: payload.data.workspaceName,
          role: payload.data.role
        };
      })
      .then((nextWorkspace) => {
        if (!active || !nextWorkspace) {
          return;
        }
        setWorkspace(nextWorkspace);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg selection:bg-accent/20">
      <Sidebar workspace={workspace} />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300 ease-out",
          sidebarCollapsed ? "ml-[72px]" : "ml-0 md:ml-[240px]"
        )}
      >
        <Header workspace={workspace} />
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
