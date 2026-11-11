import type { Locale } from "@/lib/i18n/dictionaries";
import type { LandingDictionary } from "@/lib/i18n/landing";

/** Every landing section gets the visitor's language and its text. */
export type SectionProps = { locale: Locale; t: LandingDictionary };
