"use client";

import { useState, useTransition } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { ReportStatus, ReportType } from "@/lib/api/reports";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface GenerateReportButtonsProps {
  defaultType?: ReportType;
}

interface ReportRowActionsProps {
  reportId: string;
  reportStatus: ReportStatus;
}

async function postJson(path: string, body?: unknown): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

export function GenerateReportButtons({ defaultType = "WEEKLY" }: GenerateReportButtonsProps): JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generate = (type: ReportType): void => {
    startTransition(async () => {
      setErrorMessage(null);
      const response = await postJson("/reports/generate", { type });
      if (!response.ok) {
        setErrorMessage("Impossible de générer le rapport pour le moment.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant={defaultType === "WEEKLY" ? "primary" : "outline"}
          size="sm"
          loading={isPending}
          onClick={() => generate("WEEKLY")}
        >
          Rapport hebdo
        </Button>
        <Button
          variant={defaultType === "MONTHLY" ? "primary" : "outline"}
          size="sm"
          loading={isPending}
          onClick={() => generate("MONTHLY")}
        >
          Rapport mensuel
        </Button>
      </div>
      {errorMessage ? <p className="text-xs text-youtube">{errorMessage}</p> : null}
    </div>
  );
}

export function ReportRowActions({ reportId, reportStatus }: ReportRowActionsProps): JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const retry = (): void => {
    startTransition(async () => {
      setErrorMessage(null);
      const response = await postJson(`/reports/${reportId}/retry`);
      if (!response.ok) {
        setErrorMessage("Retry impossible");
        return;
      }
      router.refresh();
    });
  };

  const canDownload = reportStatus === "DONE";
  const canRetry = reportStatus === "FAILED";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canDownload ? (
          <a
            href={`${API_URL}/reports/${reportId}/download`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text transition-colors hover:border-accent/35 hover:text-accent"
          >
            <Download size={13} />
            PDF
          </a>
        ) : null}
        {canRetry ? (
          <button
            type="button"
            onClick={retry}
            disabled={isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text transition-colors hover:border-accent/35 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Retry
          </button>
        ) : null}
      </div>
      {errorMessage ? <p className="text-xs text-youtube">{errorMessage}</p> : null}
    </div>
  );
}
