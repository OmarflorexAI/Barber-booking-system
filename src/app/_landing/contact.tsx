import { LeadForm, type LeadFormText } from "../lead-form";
import type { SectionProps } from "./types";
import { CONTACT_ID, FORM_ID, type } from "./ui";

/** Only the form's own strings go to the browser (LeadForm is a client component). */
function leadFormText(t: SectionProps["t"]): LeadFormText {
  const { shopName, ownerName, phone, optional, barbers, barbersPick, barbersMore, message, messageHint, send, sending, verifying, thanksTitle, thanksBody, errors } = t;
  return { shopName, ownerName, phone, optional, barbers, barbersPick, barbersMore, message, messageHint, send, sending, verifying, thanksTitle, thanksBody, errors };
}

/** The centered solid contact card (over the FAQ/Contact Velaris band), holding our lead form (with the Turnstile bot check). */
export function Contact({ t }: SectionProps) {
  return (
    <section id={CONTACT_ID} aria-labelledby="contact-title" className="scroll-mt-20 px-4 py-[calc(48px+8vh)] sm:px-6">
      <div className="lead-card relative mx-auto max-w-2xl rounded-2xl p-6 sm:p-8 md:p-12" data-reveal>
        <div className="text-center">
          <h2 id="contact-title" className={type.h2}>
            {t.formTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">{t.formBody}</p>
        </div>
        <div id={FORM_ID} className="mt-10">
          <LeadForm locale="en" t={leadFormText(t)} />
        </div>
      </div>
    </section>
  );
}
