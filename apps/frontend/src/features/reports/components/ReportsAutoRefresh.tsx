"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ReportsAutoRefreshProps {
  enabled: boolean;
  intervalMs?: number;
}

export function ReportsAutoRefresh({ enabled, intervalMs = 5000 }: ReportsAutoRefreshProps): null {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, router]);

  return null;
}
