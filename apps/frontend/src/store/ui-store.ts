import { create } from "zustand";

export type Period = "7d" | "30d" | "90d";
export type ThemeMode = "dark" | "light";

interface UiState {
  selectedPeriod: Period;
  sidebarOpen: boolean;
  theme: ThemeMode;
  setSelectedPeriod: (period: Period) => void;
  setSidebarOpen: (value: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedPeriod: "30d",
  sidebarOpen: false,
  theme: "dark",
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
  setTheme: (theme) => set({ theme })
}));
