import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { DemoProjectBanner } from "@/components/layout/DemoProjectBanner";
import { ThemeBootstrapper } from "@/components/layout/ThemeBootstrapper";
import { TrpcProvider } from "@/lib/trpc/provider";
import "@/app/globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"]
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "Pulse Analytics",
  description: "SaaS analytics multi-plateforme — YouTube & GA4",
  icons: {
    icon: "/pulse-icon.svg",
    shortcut: "/pulse-icon.svg",
    apple: "/pulse-icon.svg"
  }
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning>
      <body className={`${manrope.variable} ${jetbrains.variable} font-sans antialiased`}>
        <TrpcProvider>
          <ThemeBootstrapper />
          <div className="mesh-gradient">
            <div className="mesh-orb-3" />
          </div>
          <div className="relative z-10">
            {children}
          </div>
          <DemoProjectBanner />
        </TrpcProvider>
      </body>
    </html>
  );
}
