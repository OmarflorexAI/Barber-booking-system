"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { deleteMediaAction } from "@/app/app/_media/actions";
import { Notice } from "@/components/notice";
import { PhotoInput } from "@/components/photo-input";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { updateShopProfileAction } from "./actions";

export type ShopProfileInitial = {
  name: string;
  /** Already formatted for reading, e.g. "(718) 555-0123"; empty when none. */
  phone: string;
  address: string;
  aboutEn: string;
  aboutEs: string;
  logoUrl: string | null;
  coverUrl: string | null;
};

const MAX_ABOUT = 600;

type Field = "name" | "phone";
type Photo = "logo" | "cover";

/**
 * The Shop profile form (PLAN.md M5 · job 2): logo, cover, name, phone, address and About in
 * both languages, saved together with one button. A new logo or cover replaces the old one in
 * storage only after the save succeeds; an upload replaced before saving is deleted right away.
 */
export function ShopForm({ locale, initial }: { locale: Locale; initial: ShopProfileInitial }) {
  const p = dictionaries[locale].settings.shop;
  const id = useId();
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [aboutEn, setAboutEn] = useState(initial.aboutEn);
  const [aboutEs, setAboutEs] = useState(initial.aboutEs);
  const [photos, setPhotos] = useState<Record<Photo, string | null>>({ logo: initial.logoUrl, cover: initial.coverUrl });
  const [error, setError] = useState<{ text: string; field?: Field } | null>(null);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  const saved = useRef<Record<Photo, string | null>>({ logo: initial.logoUrl, cover: initial.coverUrl });
  const current = useRef<Record<Photo, string | null>>({ logo: initial.logoUrl, cover: initial.coverUrl });

  const errText = (code: string) => p.errors[code as keyof typeof p.errors] ?? p.errors.UNKNOWN;
  const touched = (field?: Field) => {
    setStatus("");
    if (error && (!field || error.field === field || !error.field)) setError(null);
  };

  function changePhoto(kind: Photo, url: string | null) {
    const old = current.current[kind];
    // An upload that was never saved has no owner once it's replaced: delete it now.
    if (old && old !== url && old !== saved.current[kind]) void deleteMediaAction(old).catch(() => {});
    current.current = { ...current.current, [kind]: url };
    setPhotos((x) => ({ ...x, [kind]: url }));
    touched();
  }

  function save() {
    setStatus("");
    if (!name.trim()) {
      setError({ text: p.errors.NAME_REQUIRED, field: "name" });
      return;
    }
    if (phone.trim() && !normalizePhone(phone)) {
      setError({ text: p.errors.PHONE_INVALID, field: "phone" });
      return;
    }
    setError(null);
    const sent = { ...photos };
    start(async () => {
      const res = await updateShopProfileAction({
        name,
        phone,
        address,
        aboutEn,
        aboutEs,
        logoUrl: sent.logo,
        coverUrl: sent.cover,
      }).catch(() => ({ ok: false as const, code: "UNKNOWN" }));
      if (!res.ok) {
        setError({ text: errText(res.code), field: res.code === "PHONE_INVALID" ? "phone" : undefined });
        return;
      }
      for (const kind of ["logo", "cover"] as const) {
        const old = saved.current[kind];
        if (old && old !== sent[kind]) void deleteMediaAction(old).catch(() => {});
      }
      saved.current = sent;
      setStatus(p.saved);
      router.refresh();
    });
  }

  const describe = (field: Field, hint: string) => (error?.field === field ? `${id}-error ${hint}` : hint);

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <PhotoInput kind="cover" shape="rect" value={photos.cover} onChange={(u) => changePhoto("cover", u)} label={p.cover} locale={locale} />
      <PhotoInput kind="logo" shape="circle" value={photos.logo} onChange={(u) => changePhoto("logo", u)} label={p.logo} locale={locale} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{p.name}</span>
        <input
          className="field"
          name="name"
          autoComplete="organization"
          autoCapitalize="words"
          maxLength={80}
          required
          value={name}
          aria-invalid={error?.field === "name" || undefined}
          aria-describedby={describe("name", `${id}-name-hint`)}
          onChange={(e) => {
            setName(e.target.value);
            touched("name");
          }}
        />
        <span id={`${id}-name-hint`} className="text-sm text-muted">
          {p.nameHint}
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{p.phone}</span>
        <input
          className="field font-mono tabular-nums"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={40}
          value={phone}
          aria-invalid={error?.field === "phone" || undefined}
          aria-describedby={describe("phone", `${id}-phone-hint`)}
          onChange={(e) => {
            setPhone(e.target.value);
            touched("phone");
          }}
          onBlur={() => {
            const e164 = phone.trim() ? normalizePhone(phone) : null;
            if (e164) setPhone(formatPhone(e164));
          }}
        />
        <span id={`${id}-phone-hint`} className="text-sm text-muted">
          {p.phoneHint}
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{p.address}</span>
        <input
          className="field"
          name="address"
          autoComplete="street-address"
          maxLength={200}
          value={address}
          aria-describedby={`${id}-address-hint`}
          onChange={(e) => {
            setAddress(e.target.value);
            touched();
          }}
        />
        <span id={`${id}-address-hint`} className="text-sm text-muted">
          {p.addressHint}
        </span>
      </label>

      <div className="flex flex-col gap-4">
        <AboutField label={p.aboutEn} lang="en" value={aboutEn} count={p.count} hintId={`${id}-about-hint`} onChange={(v) => { setAboutEn(v); touched(); }} />
        <AboutField label={p.aboutEs} lang="es" value={aboutEs} count={p.count} hintId={`${id}-about-hint`} onChange={(v) => { setAboutEs(v); touched(); }} />
        <p id={`${id}-about-hint`} className="-mt-1 text-sm text-muted">
          {p.aboutHint}
        </p>
      </div>

      {error && (
        <Notice role="alert" id={`${id}-error`}>
          <p>{error.text}</p>
        </Notice>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending} aria-busy={pending}>
          {pending && <span aria-hidden="true" className="size-2 rounded-full bg-paper motion-safe:animate-pulse" />}
          {pending ? p.saving : p.save}
        </button>
        <p role="status" className="min-h-6 text-sm text-muted">
          {status}
        </p>
      </div>
    </form>
  );
}

function AboutField(props: {
  label: string;
  lang: "en" | "es";
  value: string;
  count: (n: number) => string;
  hintId: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{props.label}</span>
        <span id={`${id}-count`} className="font-mono text-xs text-muted tabular-nums">
          {props.count(props.value.length)}
        </span>
      </span>
      <textarea
        className="field min-h-32 resize-y py-3 leading-relaxed"
        name={props.lang === "en" ? "aboutEn" : "aboutEs"}
        lang={props.lang}
        rows={5}
        maxLength={MAX_ABOUT}
        value={props.value}
        aria-describedby={`${props.hintId} ${id}-count`}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}
