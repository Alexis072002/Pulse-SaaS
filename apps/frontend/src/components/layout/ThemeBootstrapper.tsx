"use client";

import { useEffect } from "react";
import { useUiStore } from "@/store/ui-store";

export function ThemeBootstrapper(): null {
  const { setTheme, setSidebarCollapsed } = useUiStore();

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("pulse-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }

    const savedSidebar = window.localStorage.getItem("pulse-sidebar-collapsed");
    if (savedSidebar === "true") {
      setSidebarCollapsed(true);
    }
  }, [setTheme, setSidebarCollapsed]);

  return null;
}
