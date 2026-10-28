import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScrollTest } from "./ScrollTest";

export const metadata: Metadata = {
  title: "Scroll engine test",
  robots: { index: false, follow: false },
};

/**
 * TEMPORARY: checks the Lenis + ScrollTrigger engine (progress, direction, pinning).
 * Not part of the site design; development only. Delete once the first real scene exists.
 */
export default function ScrollTestPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ScrollTest />;
}
