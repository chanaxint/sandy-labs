import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "lenis/dist/lenis.css";
import "./globals.css";
import { Instrument_Sans } from "next/font/google";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { LangProvider } from "@/lib/i18n/lang";

const instrument = Instrument_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: "Sandy Labs",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={instrument.variable}>
      <body>
        <SmoothScroll />
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
