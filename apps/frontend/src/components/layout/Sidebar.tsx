"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe2,
  Home,
  Youtube,
  User2
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/store/ui-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const items = [
  { href: "/overview", label: "Overview", icon: Home },
  { href: "/youtube", label: "YouTube", icon: Youtube },
  { href: "/analytics", label: "Analytics", icon: Globe2 },
  { href: "/correlations", label: "Corrélations", icon: BrainCircuit },
  { href: "/reports", label: "Rapports", icon: FileText }
] as const;

function PulseLogo({ collapsed }: { collapsed: boolean }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15">
        <span className="text-sm font-bold text-accent">P</span>
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent animate-pulse-dot" />
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap text-lg font-bold text-text"
          >
            puls<span className="text-accent">e</span>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const [workspace, setWorkspace] = useState<{ name: string; role: string } | null>(null);

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
      .then((data) => {
        if (!active || !data) {
          return;
        }
        setWorkspace(data);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col",
        "glass-strong",
        "transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center border-b border-border px-4 py-5", sidebarCollapsed && "justify-center")}>
        <PulseLogo collapsed={sidebarCollapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-2 transition-all duration-200",
                "hover:bg-surface-hover hover:text-text",
                isActive && "bg-accent-muted text-text",
                sidebarCollapsed && "justify-center px-0"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <Icon
                size={18}
                className={cn(
                  "shrink-0 transition-colors",
                  isActive && "text-accent"
                )}
              />

              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className={cn("border-t border-border px-3 py-4", sidebarCollapsed && "flex justify-center")}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5",
            sidebarCollapsed && "px-0"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <User2 size={16} />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="truncate text-sm font-medium text-text">{workspace?.name ?? "Workspace"}</p>
                <p className="truncate text-xs uppercase tracking-[0.08em] text-text-muted">{workspace?.role ?? "viewer"}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? "Ouvrir la sidebar" : "Replier la sidebar"}
        className={cn(
          "absolute top-1/2 z-50 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text-2 shadow-glass transition-all duration-200 hover:border-border-2 hover:bg-surface-hover hover:text-text",
          sidebarCollapsed ? "right-1" : "right-2"
        )}
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
