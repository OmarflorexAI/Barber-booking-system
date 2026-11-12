import { LeadForm } from "../lead-form";
import type { SectionProps } from "./types";
import { CONTACT_ID, FORM_ID, type } from "./ui";

/** The template's centered contact card, holding our lead form (with the Turnstile bot check). */
export function Contact({ locale, t }: SectionProps) {
  return (
    <section id={CONTACT_ID} aria-labelledby="contact-title" className="scroll-mt-20 px-4 py-[calc(48px+8vh)] sm:px-6">
      <div
        className="relative mx-auto max-w-2xl rounded-2xl border border-border bg-black p-6 sm:p-8 md:p-12"
        style={{
          boxShadow: "0 -20px 50px -15px rgba(255,255,255,0.05)",
          backgroundImage: "radial-gradient(80% 50% at 50% 0%, rgb(26,26,26) 0%, transparent 70%)",
        }}
        data-reveal
      >
        <div className="text-center">
          <h2 id="contact-title" className={type.h2}>
            {t.formTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">{t.formBody}</p>
        </div>
        <div id={FORM_ID} className="mt-10">
          <LeadForm locale={locale} />
        </div>
      </div>
    </section>
  );
}
