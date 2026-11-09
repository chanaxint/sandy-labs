"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { goToSection } from "@/lib/site/sections";

/**
 * One link for every destination on the site:
 *  - a service page or any other route: a client-side link (next/link);
 *  - a place on the home page (`/#id`, or `/#create`): on the home page it scrolls there
 *    (or opens Create my website) through the scroll engine; from elsewhere it loads the
 *    home page, which goes there itself (HomeEntry);
 *  - the home page itself (`/`): a full load, so the journey starts from its opening.
 */
export function SmartLink({
  href,
  className,
  style,
  children,
  onNavigate,
  current,
  ariaLabel,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** Called on click (closing a menu, say). */
  onNavigate?: () => void;
  current?: boolean;
  ariaLabel?: string;
}) {
  const pathname = usePathname();
  const common = { className, style, "aria-current": current ? ("page" as const) : undefined, "aria-label": ariaLabel };

  if (href === "/" || href.startsWith("/#")) {
    const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
      onNavigate?.();
      if (pathname !== "/" || href === "/") return;
      if (goToSection(href.slice(2), { smooth: true })) e.preventDefault();
    };
    return (
      <a href={href} onClick={onClick} {...common}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onNavigate} {...common}>
      {children}
    </Link>
  );
}
