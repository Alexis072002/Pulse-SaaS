"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe2,
  Home,
  Settings,
  Settings2,
  Youtube,
  User2
} from "lucide-react";
import type { WorkspaceBadgeInfo } from "@/components/layout/DashboardShell";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/store/ui-store";

const items = [
  { href: "/overview", label: "Overview", icon: Home },
  { href: "/youtube", label: "YouTube", icon: Youtube },
  { href: "/analytics", label: "Analytics", icon: Globe2 },
  { href: "/correlations", label: "Corrélations", icon: BrainCircuit },
  { href: "/reports", label: "Rapports", icon: FileText },
  { href: "/workspace", label: "Workspace", icon: Settings2 }
] as const;

function PulseLogo({ collapsed }: { collapsed: boolean }): JSX.Element {
  const { theme } = useUiStore();
  const logoSrc = theme === "dark" ? "/logos/pulse-logo-dark.svg" : "/logos/pulse-logo-light.svg";

  return (
    <div className="flex items-center justify-center">
      {collapsed ? (
        <Image src="/pulse-icon.svg" alt="Pulse" width={30} height={30} className="h-8 w-8" priority />
      ) : (
        <Image src={logoSrc} alt="Pulse Analytics" width={132} height={35} className="h-8 w-auto" priority />
      )}
    </div>
  );
}

export function Sidebar({ workspace }: { workspace: WorkspaceBadgeInfo | null }): JSX.Element {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

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
      <div className={cn("flex h-16 items-center border-b border-border px-4", sidebarCollapsed && "justify-center")}>
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
                  className="absolute bottom-1 left-0 top-1 w-[3px] rounded-r-full bg-accent"
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

      <div className="px-3 pb-2">
        <div className="border-t border-border pt-3">
          <button
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Ouvrir la sidebar" : "Replier la sidebar"}
            className={cn(
              "flex h-9 w-full items-center rounded-xl border border-border bg-surface text-xs font-medium text-text-2 transition-colors hover:border-border-2 hover:text-text",
              sidebarCollapsed ? "justify-center" : "justify-between px-3"
            )}
          >
            {!sidebarCollapsed ? <span>Réduire la sidebar</span> : null}
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>

      {/* User section */}
      <div className={cn("border-t border-border px-3 py-4", sidebarCollapsed && "flex justify-center")}>
        <div className={cn("flex flex-col gap-2", sidebarCollapsed && "items-center")}>
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

          <Link
            href="/settings"
            title={sidebarCollapsed ? "Paramètres" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-text-2 transition-colors hover:border-border-2 hover:text-text",
              sidebarCollapsed && "justify-center px-0"
            )}
          >
            <Settings size={14} className="shrink-0 text-accent" />
            {!sidebarCollapsed ? <span>Paramètres</span> : null}
          </Link>
        </div>
      </div>
    </aside>
  );
}
