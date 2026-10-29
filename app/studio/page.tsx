import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = {
  title: "Story Studio · Sandy Labs",
  robots: { index: false, follow: false },
};

/** Internal tool: lay out the story's phrases on the site and save them (not linked anywhere). */
export default function StudioPage() {
  return <Studio />;
}
