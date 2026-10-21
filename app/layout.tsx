import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sandy Labs — Your vision. Your website.",
  description:
    "Sandy Labs is a website studio shaped like an island. Describe what you imagine and build a clear, structured brief for your website.",
};

export const viewport: Viewport = {
  themeColor: "#0a3640",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-1/2 focus:z-[60] focus:-translate-x-1/2 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-sand-50"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
