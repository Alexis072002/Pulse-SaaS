"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    density: number;
    alpha: number;
}

interface InteractiveParticlesProps {
    className?: string;
    density?: number;
    minSize?: number;
    maxSize?: number;
    alphaMin?: number;
    alphaMax?: number;
}

export function InteractiveParticles({
    className,
    density = 10000,
    minSize = 0.9,
    maxSize = 2.9,
    alphaMin = 0.28,
    alphaMax = 0.9
}: InteractiveParticlesProps): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouse = useRef({ x: 0, y: 0, radius: 100 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let accentRgb = { r: 245, g: 158, b: 11 };

        const parseRgb = (color: string): { r: number; g: number; b: number } => {
            const rgbMatch = color.match(/\d+/g);
            if (rgbMatch && rgbMatch.length >= 3) {
                return {
                    r: Number(rgbMatch[0]),
                    g: Number(rgbMatch[1]),
                    b: Number(rgbMatch[2])
                };
            }

            const hex = color.replace("#", "");
            if (hex.length === 6) {
                return {
                    r: Number.parseInt(hex.slice(0, 2), 16),
                    g: Number.parseInt(hex.slice(2, 4), 16),
                    b: Number.parseInt(hex.slice(4, 6), 16)
                };
            }

            if (hex.length === 3) {
                const r = hex.charAt(0);
                const g = hex.charAt(1);
                const b = hex.charAt(2);
                return {
                    r: Number.parseInt(r + r, 16),
                    g: Number.parseInt(g + g, 16),
                    b: Number.parseInt(b + b, 16)
                };
            }

            return { r: 245, g: 158, b: 11 };
        };

        const updateAccentColor = () => {
            const rawAccent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
            accentRgb = parseRgb(rawAccent || "#f59e0b");
        };

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.current.x = e.x;
            mouse.current.y = e.y;
        };

        // Initialize particles
        const initParticles = () => {
            particles = [];
            const numberOfParticles = (canvas.width * canvas.height) / density;

            for (let i = 0; i < numberOfParticles; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * (maxSize - minSize) + minSize;
                const density = Math.random() * 20 + 1; // How fast they react to mouse

                particles.push({
                    x,
                    y,
                    vx: (Math.random() - 0.5) * 0.5, // Slow natural movement
                    vy: (Math.random() - 0.5) * 0.5,
                    size,
                    density,
                    alpha: Math.random() * (alphaMax - alphaMin) + alphaMin
                });
            }
        };

        // Animation Loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const p of particles) {
                // Natural movement
                p.x += p.vx;
                p.y += p.vy;

                // Bounce off edges (or wrap around - let's wrap for smoother feel)
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                // Mouse interaction
                const dx = mouse.current.x - p.x;
                const dy = mouse.current.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = 150;

                if (distance < maxDistance) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (maxDistance - distance) / maxDistance;
                    // Move away from mouse
                    const directionX = forceDirectionX * force * p.density;
                    const directionY = forceDirectionY * force * p.density;

                    p.x -= directionX;
                    p.y -= directionY;
                } else {
                    // Return to original path (simplified: just drift naturally)
                    // If we wanted them to snap back to a grid, we'd use baseX/baseY,
                    // but for floating particles, natural drift is fine.
                }

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${p.alpha})`;
                ctx.fill();
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        updateAccentColor();
        window.addEventListener("resize", handleResize);
        window.addEventListener("mousemove", handleMouseMove);
        const observer = new MutationObserver(() => {
            updateAccentColor();
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

        handleResize();
        animate();

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
            observer.disconnect();
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas ref={canvasRef} className={cn("absolute inset-0 z-0 pointer-events-none", className)} />
    );
}
