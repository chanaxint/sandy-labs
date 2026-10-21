import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Simple shell for routes whose content has not been written yet. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="flex min-h-svh flex-col bg-sand-50 px-5 py-10 sm:px-12">
      <Link href="/" className="font-display text-2xl text-ink">
        Sandy<span className="italic text-lagoon-500"> Labs</span>
      </Link>
      <div className="my-auto max-w-2xl py-20">
        <p className="eyebrow text-lagoon-700">Placeholder</p>
        <h1 className="mt-5 font-display text-5xl font-light tracking-[-0.02em] text-ink sm:text-6xl">{title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">
          This page has not been published yet. The final {title.toLowerCase()} will appear here once it has been
          written and reviewed.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-sand-50 hover:bg-lagoon-900"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back to the homepage
        </Link>
      </div>
    </main>
  );
}
