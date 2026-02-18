"use client";

import { useEffect } from "react";
import { useUiStore, type ThemeMode } from "@/store/ui-store";

export function ThemeBootstrapper(): null {
  const setTheme = useUiStore((state) => state.setTheme);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("pulse-theme") as ThemeMode | null;
    const theme = storedTheme === "light" ? "light" : "dark";
    setTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [setTheme]);

  return null;
}
