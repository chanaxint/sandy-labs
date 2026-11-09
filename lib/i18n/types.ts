/**
 * Localization primitives shared by every part of the site (the journey's story, the
 * corporate pages, the services). The site speaks English and Turkish; the visitor's
 * choice lives in `LangProvider` (lib/i18n/lang.tsx).
 */
import type { Lang } from "@/lib/journey/story";

export type { Lang };
export const langs: readonly Lang[] = ["en", "tr"];
/** A piece of copy in every language the site speaks. */
export type Localized<T = string> = Record<Lang, T>;
