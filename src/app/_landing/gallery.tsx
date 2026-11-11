import { existsSync } from "node:fs";
import { join } from "node:path";
import { HeadViewer } from "./head-viewer";
import { frameUrl, HEADS, HEAD_SIZES } from "./heads";
import type { SectionProps } from "./types";
import { Container, SectionLabel, type } from "./ui";

/**
 * Heads whose frames are on disk. The test head only shows in development, and only
 * while no real head is ready, so it can never ship.
 */
function readyHeads() {
  const onDisk = HEADS.filter((h) =>
    HEAD_SIZES.every((size) => existsSync(join(process.cwd(), "public", frameUrl(h, size, 0)))),
  );
  const real = onDisk.filter((h) => !h.placeholder);
  if (real.length > 0) return real;
  return process.env.NODE_ENV === "development" ? onDisk : [];
}

/**
 * The haircut gallery, last before the footer: a 360° turntable of model heads the
 * visitor can drag around. The head is the one loud thing; the text stays beside it.
 */
export function Gallery({ locale, t }: SectionProps) {
  const heads = readyHeads();
  if (heads.length === 0) return null;
  return (
    <section id="styles" aria-labelledby="styles-title" className="scroll-mt-20 py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:pt-10">
          <SectionLabel color="blue">{t.galleryLabel}</SectionLabel>
          <h2 id="styles-title" className={`${type.h2} mt-5 max-w-[16ch] text-night-ink`}>
            {t.galleryTitle}
          </h2>
          <p className={`${type.lead} mt-5 max-w-[40ch]`}>{t.galleryBody}</p>
        </div>
        <HeadViewer
          heads={heads}
          locale={locale}
          hint={t.galleryHint}
          keysHint={t.galleryKeys}
          loadingLabel={t.galleryLoading}
          pickerLabel={t.galleryPicker}
        />
      </Container>
    </section>
  );
}
