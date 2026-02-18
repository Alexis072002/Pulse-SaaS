"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, FileText, Globe2, Home, Youtube } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/overview", label: "Overview", icon: Home },
  { href: "/youtube", label: "YouTube", icon: Youtube },
  { href: "/analytics", label: "Analytics", icon: Globe2 },
  { href: "/correlations", label: "Corrélations", icon: BrainCircuit },
  { href: "/reports", label: "Rapports", icon: FileText }
] as const;

export function Sidebar(): JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-border bg-surface md:block">
      <div className="px-6 pb-8 pt-7">
        <p className="font-syne text-2xl font-extrabold text-text">
          puls<span className="text-accent2">e</span>
        </p>
      </div>
      <nav className="space-y-1 px-3">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text2 transition duration-150",
                "hover:bg-white/5 hover:text-text",
                isActive && "border-l-2 border-accent bg-accent/15 text-text"
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
