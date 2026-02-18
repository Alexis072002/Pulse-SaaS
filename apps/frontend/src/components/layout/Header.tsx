"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/store/ui-store";

export function Header(): JSX.Element {
  const { theme, setTheme } = useUiStore();

  const toggleTheme = (): void => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem("pulse-theme", nextTheme);
  };

  return (
    <header className="flex h-16 items-center justify-end border-b border-border px-6">
      <Button variant="ghost" onClick={toggleTheme} className="gap-2">
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        {theme === "dark" ? "Light" : "Dark"}
      </Button>
    </header>
  );
}
