import { ChairIcon, DoorIcon, ExportIcon, LanguagesIcon, PayIcon, PhoneIcon } from "./icons";
import type { SectionProps } from "./types";
import { Container } from "./ui";

const ICONS = [PhoneIcon, LanguagesIcon, PayIcon, ChairIcon, DoorIcon, ExportIcon];

/**
 * Six things that work today, in the template's bordered grid (where its logo bar was).
 * The hairlines are the grid's 1px gaps showing the border color through.
 */
export function Facts({ t }: SectionProps) {
  return (
    <section aria-label={t.factsLabel} className="border-y border-border py-[calc(24px+4vh)]">
      <Container>
        <ul className="grid grid-cols-2 gap-px bg-border md:grid-cols-3" data-reveal>
          {t.facts.map((fact, i) => {
            const Icon = ICONS[i];
            return (
              <li key={fact} className="flex flex-col items-center gap-4 bg-background px-3 py-8 text-center sm:px-6">
                <Icon className="h-6 w-6 text-foreground" />
                <p className="max-w-[24ch] text-pretty text-[15px] leading-snug text-foreground/90">{fact}</p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
