"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

interface InteractiveSignalMeshProps {
  className?: string;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface NodePoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  tint: number;
  colorSeed: number;
}

const MAX_CANVAS_DIMENSION = 8192;
const MAX_CANVAS_AREA = 24_000_000;
const LINK_DISTANCE = 128;
const MOUSE_RADIUS = 170;
const CELL_SIZE = LINK_DISTANCE;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseRgb(raw: string, fallback: string): RgbColor {
  const value = raw.trim() || fallback;
  const rgbMatch = value.match(/\d+/g);
  if (rgbMatch && rgbMatch.length >= 3) {
    return {
      r: Number(rgbMatch[0]),
      g: Number(rgbMatch[1]),
      b: Number(rgbMatch[2])
    };
  }

  const hex = value.replace("#", "");
  if (hex.length === 6) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16)
    };
  }

  if (hex.length === 3) {
    return {
      r: Number.parseInt(hex.charAt(0) + hex.charAt(0), 16),
      g: Number.parseInt(hex.charAt(1) + hex.charAt(1), 16),
      b: Number.parseInt(hex.charAt(2) + hex.charAt(2), 16)
    };
  }

  return { r: 169, g: 87, b: 15 };
}

function mixColor(a: RgbColor, b: RgbColor, t: number): RgbColor {
  const p = clamp(t, 0, 1);
  return {
    r: Math.round(a.r + (b.r - a.r) * p),
    g: Math.round(a.g + (b.g - a.g) * p),
    b: Math.round(a.b + (b.b - a.b) * p)
  };
}

function rgba(color: RgbColor, alpha: number): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

export function InteractiveSignalMesh({ className }: InteractiveSignalMeshProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const targetMouse = useRef({ x: 0.5, y: 0.45, active: false });
  const smoothMouse = useRef({ x: 0.5, y: 0.45 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let scale = 1;
    let rafId = 0;
    let nodes: NodePoint[] = [];

    let accent = parseRgb(getComputedStyle(document.documentElement).getPropertyValue("--accent"), "#a9570f");
    let textTwo = parseRgb(getComputedStyle(document.documentElement).getPropertyValue("--text-2"), "#35486c");
    let textMuted = parseRgb(getComputedStyle(document.documentElement).getPropertyValue("--text-muted"), "#556a92");
    let nodeBase = mixColor(accent, textTwo, 0.46);
    let warmPalette: RgbColor[] = [
      accent,
      parseRgb("", "#f97316"),
      parseRgb("", "#ef4444")
    ];

    const readPalette = () => {
      const styles = getComputedStyle(document.documentElement);
      accent = parseRgb(styles.getPropertyValue("--accent"), "#a9570f");
      textTwo = parseRgb(styles.getPropertyValue("--text-2"), "#35486c");
      textMuted = parseRgb(styles.getPropertyValue("--text-muted"), "#556a92");
      nodeBase = mixColor(accent, textTwo, 0.46);
      warmPalette = [
        accent,
        parseRgb(styles.getPropertyValue("--warning"), "#f97316"),
        parseRgb(styles.getPropertyValue("--danger"), "#ef4444")
      ];
    };

    const initNodes = () => {
      const area = width * height;
      const density = width >= 1280 ? 9_800 : width >= 900 ? 11_200 : 13_400;
      const count = clamp(Math.round(area / density), 46, 152);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.26,
        vy: (Math.random() - 0.5) * 0.22,
        radius: Math.random() * 3.2 + 2.4,
        phase: Math.random() * Math.PI * 2,
        tint: Math.random(),
        colorSeed: Math.random()
      }));
    };

    const setCanvasSize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);

      const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
      const maxScaleByDimension = Math.min(MAX_CANVAS_DIMENSION / width, MAX_CANVAS_DIMENSION / height);
      const maxScaleByArea = Math.sqrt(MAX_CANVAS_AREA / (width * height));
      scale = clamp(Math.min(deviceScale, maxScaleByDimension, maxScaleByArea), 0.7, deviceScale);

      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
      initNodes();
    };

    const updateMousePosition = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      targetMouse.current.x = clamp(x, 0, 1);
      targetMouse.current.y = clamp(y, 0, 1);
      targetMouse.current.active = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    };

    const resetMouse = () => {
      targetMouse.current = { x: 0.5, y: 0.45, active: false };
    };

    const draw = (timestamp: number) => {
      const t = timestamp * 0.001;
      const motionFactor = prefersReducedMotion.matches ? 0 : 1;
      const mouseEase = prefersReducedMotion.matches ? 0.16 : 0.065;

      smoothMouse.current.x += (targetMouse.current.x - smoothMouse.current.x) * mouseEase;
      smoothMouse.current.y += (targetMouse.current.y - smoothMouse.current.y) * mouseEase;

      const mouseX = smoothMouse.current.x * width;
      const mouseY = smoothMouse.current.y * height;

      context.clearRect(0, 0, width, height);

      const wash = context.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, Math.max(width, height) * 0.64);
      wash.addColorStop(0, rgba(accent, 0.06));
      wash.addColorStop(0.42, rgba(textMuted, 0.04));
      wash.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = wash;
      context.fillRect(0, 0, width, height);

      const grid = new Map<string, number[]>();
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (!node) continue;

        node.x += node.vx;
        node.y += node.vy;

        node.x += Math.sin(t * 0.42 + node.phase) * 0.12 * motionFactor;
        node.y += Math.cos(t * 0.36 + node.phase) * 0.1 * motionFactor;

        if (targetMouse.current.active) {
          const dx = node.x - mouseX;
          const dy = node.y - mouseY;
          const distanceSq = dx * dx + dy * dy;
          if (distanceSq < MOUSE_RADIUS * MOUSE_RADIUS) {
            const distance = Math.sqrt(distanceSq) || 1;
            const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
            const nudge = force * 1.4;
            node.x += (dx / distance) * nudge;
            node.y += (dy / distance) * nudge;
          }
        }

        if (node.x < -12) node.x = width + 12;
        if (node.x > width + 12) node.x = -12;
        if (node.y < -12) node.y = height + 12;
        if (node.y > height + 12) node.y = -12;

        const cellX = Math.floor(node.x / CELL_SIZE);
        const cellY = Math.floor(node.y / CELL_SIZE);
        const key = `${cellX}:${cellY}`;
        const bucket = grid.get(key);
        if (bucket) {
          bucket.push(i);
        } else {
          grid.set(key, [i]);
        }
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        if (!a) continue;
        const cellX = Math.floor(a.x / CELL_SIZE);
        const cellY = Math.floor(a.y / CELL_SIZE);

        for (let ox = -1; ox <= 1; ox += 1) {
          for (let oy = -1; oy <= 1; oy += 1) {
            const bucket = grid.get(`${cellX + ox}:${cellY + oy}`);
            if (!bucket) continue;

            for (const j of bucket) {
              if (j <= i) continue;
              const b = nodes[j];
              if (!b) continue;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const distSq = dx * dx + dy * dy;
              if (distSq > LINK_DISTANCE * LINK_DISTANCE) continue;

              const dist = Math.sqrt(distSq);
              const proximity = 1 - dist / LINK_DISTANCE;
              let alpha = proximity * proximity * 0.23;

              if (targetMouse.current.active) {
                const midX = (a.x + b.x) * 0.5;
                const midY = (a.y + b.y) * 0.5;
                const mdx = midX - mouseX;
                const mdy = midY - mouseY;
                const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mDist < MOUSE_RADIUS * 1.25) {
                  alpha *= 1.35;
                }
              }

              context.strokeStyle = rgba(accent, alpha);
              context.lineWidth = 0.9;
              context.beginPath();
              context.moveTo(a.x, a.y);
              context.lineTo(b.x, b.y);
              context.stroke();

              if ((i * 17 + j * 11) % 29 === 0 && dist < LINK_DISTANCE * 0.72) {
                const pulseT = (t * (0.14 + ((i + j) % 5) * 0.03) + ((i + j) % 97) / 97) % 1;
                const px = a.x + dx * pulseT;
                const py = a.y + dy * pulseT;

                context.fillStyle = rgba(accent, 0.82);
                context.beginPath();
                context.arc(px, py, 1.8, 0, Math.PI * 2);
                context.fill();
              }
            }
          }
        }
      }

      for (const node of nodes) {
        const pulse = 1 + Math.sin(t * 1.9 + node.phase) * 0.1 * motionFactor;
        const r = node.radius * pulse;
        const paletteIndex = Math.floor(node.colorSeed * warmPalette.length) % warmPalette.length;
        const warmTone = warmPalette[paletteIndex] ?? accent;
        const tone = mixColor(warmTone, nodeBase, 0.16 + node.tint * 0.14);

        context.fillStyle = rgba(tone, 0.2);
        context.beginPath();
        context.arc(node.x, node.y, r * 2.1, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = rgba(tone, 0.84);
        context.beginPath();
        context.arc(node.x, node.y, r, 0, Math.PI * 2);
        context.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    const resizeObserver = new ResizeObserver(() => {
      setCanvasSize();
    });

    const themeObserver = new MutationObserver(() => {
      readPalette();
    });

    readPalette();
    setCanvasSize();
    resizeObserver.observe(host);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    window.addEventListener("pointermove", updateMousePosition, { passive: true });
    window.addEventListener("pointerleave", resetMouse, { passive: true });
    rafId = requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", updateMousePosition);
      window.removeEventListener("pointerleave", resetMouse);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={hostRef} className={cn("absolute inset-0 z-0 pointer-events-none overflow-hidden", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(100%_70%_at_50%_0%,rgba(255,255,255,0.16),transparent_68%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_32%,rgba(255,255,255,0.02))]" />
    </div>
  );
}
