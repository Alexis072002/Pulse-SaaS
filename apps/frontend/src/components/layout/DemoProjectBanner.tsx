"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function DemoProjectBanner(): JSX.Element | null {
  const [isVisible, setIsVisible] = useState(true);

  const closeBanner = (): void => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-3xl items-start gap-3 rounded-2xl border border-[#d6a32a] bg-[#f5c54d] px-4 py-3 text-[#2e2305] shadow-glass backdrop-blur-xl">
        <p className="text-sm font-medium leading-5 text-[#2e2305]">
          Projet de démonstration: ce SaaS est une vitrine technique pour présenter mes capacités fullstack
          (architecture, produit, UX, data et intégrations).
        </p>
        <button
          type="button"
          onClick={closeBanner}
          aria-label="Fermer le bandeau d'information"
          className="mt-0.5 shrink-0 rounded-lg border border-[#2e2305]/20 bg-[#2e2305]/10 p-1.5 text-[#2e2305]/80 transition-colors hover:border-[#2e2305]/35 hover:text-[#2e2305]"
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  );
}
