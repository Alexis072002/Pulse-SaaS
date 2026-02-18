import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Syne } from "next/font/google";
import type { ReactNode } from "react";
import { ThemeBootstrapper } from "@/components/layout/ThemeBootstrapper";
import { TrpcProvider } from "@/lib/trpc/provider";
import "@/app/globals.css";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["700", "800"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["300", "400", "500"] });
const dmMono = DM_Mono({ subsets: ["latin"], variable: "--font-dm-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Pulse Analytics",
  description: "SaaS analytics multi-plateforme"
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="fr" data-theme="dark">
      <body className={`${syne.variable} ${dmSans.variable} ${dmMono.variable}`}>
        <TrpcProvider>
          <ThemeBootstrapper />
          {children}
        </TrpcProvider>
      </body>
    </html>
  );
}
