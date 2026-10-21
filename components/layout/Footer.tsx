import Link from "next/link";
import { sectionIds } from "@/lib/navigation";
import { TopoLines } from "../ui/TopoLines";

const columns = [
  {
    title: "Navigate",
    links: [
      { label: "Home", href: `/#${sectionIds.home}` },
      { label: "Create your website", href: `/#${sectionIds.create}` },
      { label: "How It Works", href: `/#${sectionIds.howItWorks}` },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Example Websites", href: `/#${sectionIds.examples}` },
      { label: "What We Do", href: `/#${sectionIds.whatWeDo}` },
      { label: "Contact", href: `/#${sectionIds.contact}` },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-palm-900 text-sand-100">
      <TopoLines className="pointer-events-none absolute -bottom-72 -left-40 h-[820px] w-[820px] text-palm-500/30" />
      <div className="relative mx-auto max-w-[1440px] px-5 pt-20 pb-10 sm:px-8 lg:px-14">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href={`/#${sectionIds.home}`} className="font-display text-4xl font-light tracking-[-0.02em] text-sand-50">
              Sandy<span className="italic text-lagoon-300"> Labs</span>
            </Link>
            <p className="mt-5 max-w-sm leading-relaxed text-sand-100/65">
              A studio for considered websites. Describe your vision, shape the experience, and leave with a clear
              brief.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7">
            {columns.map((col) => (
              <div key={col.title}>
                <h2 className="eyebrow text-sand-100/50">{col.title}</h2>
                <ul className="mt-5 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sand-50/90 transition-colors hover:text-lagoon-300">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-20 flex flex-col gap-3 border-t border-sand-50/10 pt-8 text-xs text-sand-100/50 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Sandy Labs. All rights reserved.</p>
          <p>Example concepts shown on this site are illustrative and not client work.</p>
        </div>
      </div>
    </footer>
  );
}
