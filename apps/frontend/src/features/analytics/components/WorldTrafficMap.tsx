"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Ga4Country } from "@/lib/api/analytics";
import { useUiStore } from "@/store/ui-store";

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
  const { theme } = useUiStore();
  const sectionRef = useRef<HTMLElement | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const rows = useMemo(
    () => countries
      .filter((country) => country.countryCode !== "UN" && country.sessions > 0)
      .map((country) => [country.countryCode, country.sessions] as [string, number]),
    [countries]
  );

  useEffect(() => {
    if (!sectionRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          return;
        }
        setIsVisible(true);
        observer.disconnect();
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isVisible) {
      return;
    }

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
  }, [isVisible]);

  useEffect(() => {
    if (!isReady || !chartRef.current || !window.google?.visualization) {
      return;
    }

    const styles = window.getComputedStyle(document.documentElement);
    const textSecondary = styles.getPropertyValue("--text-2").trim() || "#4a5b7c";
    const accent = styles.getPropertyValue("--accent").trim() || "#bc620f";

    const datalessRegionColor = theme === "light" ? "rgba(15,23,42,0.07)" : "rgba(255,255,255,0.05)";
    const defaultColor = theme === "light" ? "rgba(188,98,15,0.22)" : "rgba(217,119,6,0.18)";
    const colorAxis = theme === "light"
      ? ["rgba(188,98,15,0.22)", accent, "#8a460b"]
      : ["rgba(217,119,6,0.22)", accent, "#8a460b"];

    const dataTable = new window.google.visualization.DataTable();
    dataTable.addColumn("string", "Country");
    dataTable.addColumn("number", "Sessions");
    dataTable.addRows(rows);

    const chart = new window.google.visualization.GeoChart(chartRef.current);
    chart.draw(dataTable, {
      backgroundColor: "transparent",
      datalessRegionColor,
      defaultColor,
      colorAxis: {
        colors: colorAxis
      },
      legend: {
        textStyle: {
          color: textSecondary
        }
      },
      tooltip: {
        textStyle: {
          color: "#0F172A"
        }
      },
      keepAspectRatio: true
    });
  }, [isReady, rows, theme]);

  return (
    <section ref={sectionRef} className="glass rounded-2xl p-5">
      <h2 className="mb-4 text-base font-semibold text-text">Carte monde (sessions)</h2>

      {hasError ? (
        <p className="text-sm text-text-2">
          Impossible de charger la carte mondiale. Vérifie l&apos;accès réseau ou la politique de blocage de scripts.
        </p>
      ) : !isVisible ? (
        <div className="h-[380px] w-full rounded-xl border border-border bg-surface-2" />
      ) : (
        <div
          ref={chartRef}
          className="h-[380px] w-full overflow-hidden rounded-xl border border-border bg-surface"
        />
      )}

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-2">Aucune donnée pays exploitable pour la période sélectionnée.</p>
      ) : null}
    </section>
  );
}
