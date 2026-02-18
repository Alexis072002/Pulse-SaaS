"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Ga4Country } from "@/lib/api/analytics";

interface WorldTrafficMapProps {
  countries: Ga4Country[];
}

interface GeoChartOptions {
  backgroundColor: string;
  datalessRegionColor: string;
  defaultColor: string;
  colorAxis: {
    colors: string[];
  };
  legend: {
    textStyle: {
      color: string;
    };
  };
  tooltip: {
    textStyle: {
      color: string;
    };
  };
  keepAspectRatio: boolean;
}

interface DataTableLike {
  addColumn(type: "string" | "number", label: string): void;
  addRows(rows: Array<[string, number]>): void;
}

interface GeoChartLike {
  draw(data: DataTableLike, options: GeoChartOptions): void;
}

interface GoogleChartsLike {
  load(version: "current", settings: { packages: ["geochart"]; mapsApiKey?: string }): void;
  setOnLoadCallback(callback: () => void): void;
}

interface GoogleVisualizationLike {
  DataTable: new () => DataTableLike;
  GeoChart: new (container: HTMLElement) => GeoChartLike;
}

interface GoogleLike {
  charts: GoogleChartsLike;
  visualization: GoogleVisualizationLike;
}

declare global {
  interface Window {
    google?: GoogleLike;
  }
}

const GOOGLE_CHARTS_LOADER = "https://www.gstatic.com/charts/loader.js";

function loadGoogleChartsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-charts-loader='true']");
    if (existing) {
      if (window.google?.charts && window.google?.visualization) {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("GOOGLE_CHARTS_LOAD_FAILED")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_CHARTS_LOADER;
    script.async = true;
    script.defer = true;
    script.dataset.googleChartsLoader = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("GOOGLE_CHARTS_LOAD_FAILED")), { once: true });
    document.head.appendChild(script);
  });
}

export function WorldTrafficMap({ countries }: WorldTrafficMapProps): JSX.Element {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const rows = useMemo(
    () => countries
      .filter((country) => country.countryCode !== "UN" && country.sessions > 0)
      .map((country) => [country.countryCode, country.sessions] as [string, number]),
    [countries]
  );

  useEffect(() => {
    let cancelled = false;

    const initialize = async (): Promise<void> => {
      try {
        await loadGoogleChartsScript();
        if (cancelled || !window.google?.charts) {
          return;
        }

        const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        window.google.charts.load("current", {
          packages: ["geochart"],
          mapsApiKey: mapsApiKey || undefined
        });
        window.google.charts.setOnLoadCallback(() => {
          if (!cancelled) {
            setIsReady(true);
          }
        });
      } catch {
        if (!cancelled) {
          setHasError(true);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !chartRef.current || !window.google?.visualization) {
      return;
    }

    const dataTable = new window.google.visualization.DataTable();
    dataTable.addColumn("string", "Country");
    dataTable.addColumn("number", "Sessions");
    dataTable.addRows(rows);

    const chart = new window.google.visualization.GeoChart(chartRef.current);
    chart.draw(dataTable, {
      backgroundColor: "transparent",
      datalessRegionColor: "#14141F",
      defaultColor: "#2A1E45",
      colorAxis: {
        colors: ["#2A1E45", "#7C3AED", "#A855F7"]
      },
      legend: {
        textStyle: {
          color: "#8888AA"
        }
      },
      tooltip: {
        textStyle: {
          color: "#F0F0FF"
        }
      },
      keepAspectRatio: true
    });
  }, [isReady, rows]);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-4 font-syne text-xl font-bold text-text">Carte monde (sessions)</h2>

      {hasError ? (
        <p className="text-sm text-text2">
          Impossible de charger la carte mondiale. Vérifie l'accès réseau ou la politique de blocage de scripts.
        </p>
      ) : (
        <div
          ref={chartRef}
          className="h-[380px] w-full overflow-hidden rounded-lg border border-border bg-surface2"
        />
      )}

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-text2">Aucune donnée pays exploitable pour la période sélectionnée.</p>
      ) : null}
    </section>
  );
}
