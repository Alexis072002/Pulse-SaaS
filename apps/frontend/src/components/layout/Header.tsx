"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, LogOut, Moon, Search, Sun } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/store/ui-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function Header(): JSX.Element {
  const { theme, setTheme } = useUiStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const toggleTheme = (): void => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem("pulse-theme", nextTheme);
  };

  const logout = async (): Promise<void> => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } finally {
      window.location.assign("/");
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border px-6",
        "glass-strong",
        "transition-all duration-300"
      )}
    >
      {/* Search bar */}
      <div className="relative max-w-md flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Rechercher..."
          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-4 text-sm text-text outline-none backdrop-blur-lg transition-all placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-text-2 transition-colors hover:bg-surface-hover hover:text-text">
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-text-2 transition-colors hover:bg-surface-hover hover:text-text"
        >
          <motion.div
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </motion.div>
        </button>

        {/* User avatar */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent transition-all hover:bg-accent/25">
          U
        </button>
        <button
          onClick={logout}
          disabled={isLoggingOut}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-text-2 transition-colors hover:border-accent/35 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut size={14} />
          {isLoggingOut ? "Déconnexion..." : "Déconnexion"}
        </button>
      </div>
    </header>
  );
}
