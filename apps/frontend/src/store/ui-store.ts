import { create } from "zustand";

export type Period = "7d" | "30d" | "90d";
export type ThemeMode = "dark" | "light";

interface UiState {
  selectedPeriod: Period;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  setSelectedPeriod: (period: Period) => void;
  setSidebarOpen: (value: boolean) => void;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedPeriod: "30d",
  sidebarOpen: false,
  sidebarCollapsed: false,
  theme: "dark",
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("pulse-sidebar-collapsed", String(next));
      }
      return { sidebarCollapsed: next };
    }),
  setTheme: (theme) => set({ theme })
}));
