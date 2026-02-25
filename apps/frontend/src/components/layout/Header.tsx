"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCheck, LogOut, Moon, Search, Settings, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { WorkspaceBadgeInfo } from "@/components/layout/DashboardShell";
import { useUiStore } from "@/store/ui-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const RECENT_SEARCHES_KEY = "pulse-recent-searches";
const MAX_RECENT_SEARCHES = 6;
const NOTIFICATIONS_STORAGE_KEY = "pulse-notifications-v1";
const SEEN_DONE_REPORTS_STORAGE_KEY = "pulse-seen-done-reports";

interface SearchEntry {
  id: string;
  label: string;
  description: string;
  href: string;
  keywords: string[];
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  unread: boolean;
  createdAt: number;
}

interface ReportDoneItem {
  id: string;
  type: "WEEKLY" | "MONTHLY";
  periodEnd: string;
}

interface ApiSuccess<TData> {
  success?: boolean;
  data?: TData;
}

const SEARCH_ENTRIES: SearchEntry[] = [
  { id: "overview", label: "Overview", description: "Vue globale des KPIs", href: "/overview", keywords: ["dashboard", "kpi", "pulse"] },
  { id: "youtube", label: "YouTube", description: "Chaîne, vidéos, rétention", href: "/youtube", keywords: ["video", "retention", "views"] },
  { id: "analytics", label: "Analytics", description: "Sessions web et acquisition", href: "/analytics", keywords: ["ga4", "sessions", "traffic"] },
  { id: "correlations", label: "Corrélations", description: "Impact vidéo vers trafic", href: "/correlations", keywords: ["impact", "lag", "ia"] },
  { id: "reports", label: "Rapports", description: "Exports PDF et envois", href: "/reports", keywords: ["pdf", "email", "schedule"] },
  { id: "workspace", label: "Workspace", description: "Membres et invitations", href: "/workspace", keywords: ["team", "rbac", "invite"] },
  { id: "settings", label: "Paramètres", description: "Préférences du dashboard", href: "/settings", keywords: ["theme", "preferences", "options"] }
];

async function fetchDoneReports(): Promise<ReportDoneItem[]> {
  const response = await fetch(`${API_URL}/reports?status=DONE`, {
    credentials: "include"
  });
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as ApiSuccess<Array<{ id: string; type: "WEEKLY" | "MONTHLY"; periodEnd: string }>>;
  if (!payload.success || !Array.isArray(payload.data)) {
    return [];
  }

  return payload.data.map((report) => ({
    id: report.id,
    type: report.type,
    periodEnd: report.periodEnd
  }));
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function formatReportType(type: "WEEKLY" | "MONTHLY"): string {
  return type === "WEEKLY" ? "hebdo" : "mensuel";
}

function readStoredNotificationItems(): NotificationItem[] {
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry): entry is NotificationItem => {
        if (typeof entry !== "object" || entry === null) {
          return false;
        }
        const value = entry as Partial<NotificationItem>;
        return (
          typeof value.id === "string" &&
          typeof value.title === "string" &&
          typeof value.description === "string" &&
          typeof value.href === "string" &&
          typeof value.unread === "boolean" &&
          typeof value.createdAt === "number"
        );
      })
      .slice(0, 30);
  } catch {
    return [];
  }
}

function persistNotificationItems(items: NotificationItem[]): void {
  window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
}

function readSeenDoneReportIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_DONE_REPORTS_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }
    return new Set(parsed.filter((entry): entry is string => typeof entry === "string"));
  } catch {
    return new Set<string>();
  }
}

function persistSeenDoneReportIds(ids: Set<string>): void {
  window.localStorage.setItem(SEEN_DONE_REPORTS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

export function Header({ workspace }: { workspace: WorkspaceBadgeInfo | null }): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useUiStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearchIds, setRecentSearchIds] = useState<string[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const searchRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const seenDoneReportsRef = useRef<Set<string>>(new Set<string>());
  const baselineInitializedRef = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          setRecentSearchIds(parsed.filter((item): item is string => typeof item === "string"));
        }
      } catch {
        // Ignore invalid local data.
      }
    }

    const storedNotifications = readStoredNotificationItems();
    setNotifications(storedNotifications);

    const seenDoneReports = readSeenDoneReportIds();
    seenDoneReportsRef.current = seenDoneReports;
    baselineInitializedRef.current = seenDoneReports.size > 0;
  }, []);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const refreshNotifications = async (): Promise<void> => {
      setNotificationsLoading(true);
      try {
        const doneReports = await fetchDoneReports();
        if (!active) {
          return;
        }

        const seenIds = seenDoneReportsRef.current;

        if (!baselineInitializedRef.current) {
          doneReports.forEach((report) => seenIds.add(report.id));
          baselineInitializedRef.current = true;
          persistSeenDoneReportIds(seenIds);
          setNotificationsLoading(false);
          return;
        }

        const newDoneReports = doneReports.filter((report) => !seenIds.has(report.id));
        if (newDoneReports.length > 0) {
          const nextItems = newDoneReports.map((report) => ({
            id: `report-ready-${report.id}`,
            title: "Rapport prêt",
            description: `Ton rapport ${formatReportType(report.type)} est disponible (${new Date(report.periodEnd).toLocaleDateString("fr-FR")}).`,
            href: "/reports",
            unread: true,
            createdAt: Date.now()
          }));

          setNotifications((previous) => {
            const merged = [...nextItems, ...previous].slice(0, 30);
            persistNotificationItems(merged);
            return merged;
          });
        }

        doneReports.forEach((report) => seenIds.add(report.id));
        persistSeenDoneReportIds(seenIds);
      } finally {
        if (active) {
          setNotificationsLoading(false);
        }
      }
    };

    void refreshNotifications();
    const interval = window.setInterval(() => {
      void refreshNotifications();
    }, 7000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const suggestions = useMemo(() => {
    const term = normalize(searchQuery);
    if (!term) {
      const recentItems = recentSearchIds
        .map((id) => SEARCH_ENTRIES.find((entry) => entry.id === id))
        .filter((entry): entry is SearchEntry => Boolean(entry));
      return recentItems.length > 0 ? recentItems : SEARCH_ENTRIES.slice(0, 5);
    }

    return SEARCH_ENTRIES.filter((entry) => {
      if (entry.label.toLowerCase().includes(term)) {
        return true;
      }
      if (entry.description.toLowerCase().includes(term)) {
        return true;
      }
      return entry.keywords.some((keyword) => keyword.includes(term));
    }).slice(0, 8);
  }, [recentSearchIds, searchQuery]);

  const unreadNotificationsCount = notifications.filter((notification) => notification.unread).length;

  const toggleTheme = (): void => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem("pulse-theme", nextTheme);
  };

  const pushRecentSearch = (entryId: string): void => {
    setRecentSearchIds((previous) => {
      const next = [entryId, ...previous.filter((item) => item !== entryId)].slice(0, MAX_RECENT_SEARCHES);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const selectSearchEntry = (entry: SearchEntry): void => {
    pushRecentSearch(entry.id);
    setSearchOpen(false);
    setSearchQuery("");
    if (pathname !== entry.href) {
      router.push(entry.href as Route);
    }
  };

  const markNotificationsAsRead = (): void => {
    setNotifications((previous) => {
      const next = previous.map((notification) => ({ ...notification, unread: false }));
      persistNotificationItems(next);
      return next;
    });
  };

  const removeNotification = (id: string): void => {
    setNotifications((previous) => {
      const next = previous.filter((notification) => notification.id !== id);
      persistNotificationItems(next);
      return next;
    });
  };

  const openNotification = (notification: NotificationItem): void => {
    setNotifications((previous) => {
      const next = previous.map((item) =>
        item.id === notification.id
          ? { ...item, unread: false }
          : item
      );
      persistNotificationItems(next);
      return next;
    });

    setNotificationsOpen(false);
    if (pathname !== notification.href) {
      router.push(notification.href as Route);
    }
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
      <div ref={searchRef} className="relative max-w-md flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Rechercher une page, un module..."
          value={searchQuery}
          onFocus={() => setSearchOpen(true)}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setSearchOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSearchOpen(false);
              return;
            }
            if (event.key === "Enter" && suggestions[0]) {
              event.preventDefault();
              selectSearchEntry(suggestions[0]);
            }
          }}
          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-4 text-sm text-text outline-none backdrop-blur-lg transition-all placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
        />

        {searchOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-border bg-surface shadow-glass">
            <div className="border-b border-border/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              {normalize(searchQuery) ? "Résultats" : "Dernières recherches"}
            </div>
            <div className="max-h-72 overflow-y-auto p-1">
              {suggestions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-text-muted">Aucun résultat pour cette recherche.</p>
              ) : (
                suggestions.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => selectSearchEntry(entry)}
                    className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-hover"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{entry.label}</p>
                      <p className="truncate text-xs text-text-2">{entry.description}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((value) => !value)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-text-2 transition-colors hover:bg-surface-hover hover:text-text"
          >
            <Bell size={16} />
            {unreadNotificationsCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-white shadow-[0_0_10px_var(--accent-glow)]">
                {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
              </span>
            ) : null}
          </button>

          {notificationsOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[340px] overflow-hidden rounded-xl border border-border bg-surface shadow-glass">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted">Notifications</p>
                <button
                  type="button"
                  onClick={markNotificationsAsRead}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-accent transition-opacity hover:opacity-80"
                >
                  <CheckCheck size={12} />
                  Tout marquer lu
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto p-1">
                {notificationsLoading && notifications.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-text-muted">Chargement...</p>
                ) : notifications.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-text-muted">Aucune notification pour le moment.</p>
                ) : (
                  notifications
                    .slice()
                    .sort((left, right) => right.createdAt - left.createdAt)
                    .map((notification) => (
                      <div key={notification.id} className="group flex items-start gap-1 rounded-lg px-2 py-1 hover:bg-surface-hover">
                        <button
                          type="button"
                          onClick={() => openNotification(notification)}
                          className="flex min-w-0 flex-1 items-start gap-2 rounded-md px-1 py-1 text-left"
                        >
                          <span
                            className={cn(
                              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                              notification.unread ? "bg-accent" : "bg-border-2"
                            )}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-text">{notification.title}</span>
                            <span className="block truncate text-xs text-text-2">{notification.description}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label="Supprimer cette notification"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface hover:text-text"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          ) : null}
        </div>

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

        <Link
          href="/settings"
          className="hidden h-9 w-9 items-center justify-center rounded-xl text-text-2 transition-colors hover:bg-surface-hover hover:text-text md:inline-flex"
          aria-label="Ouvrir les paramètres"
        >
          <Settings size={16} />
        </Link>

        <div className="hidden max-w-[220px] truncate text-right md:block">
          <p className="truncate text-xs font-medium text-text">
            {workspace?.name ?? "Workspace"}
          </p>
          <p className="text-[11px] uppercase tracking-[0.1em] text-text-muted">
            {workspace?.role ?? "viewer"}
          </p>
        </div>
        <Link
          href="/workspace"
          aria-label="Ouvrir la gestion du workspace"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent transition-all hover:bg-accent/25"
        >
          {workspace?.name?.slice(0, 1).toUpperCase() ?? "W"}
        </Link>
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
