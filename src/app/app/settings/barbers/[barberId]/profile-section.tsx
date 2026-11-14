"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { deleteMediaAction } from "@/app/app/_media/actions";
import { Notice } from "@/components/notice";
import { PhotoInput } from "@/components/photo-input";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { normalizeInstagram } from "@/lib/instagram";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { updateProfileAction } from "./profile-actions";

export type ProfileInitial = {
  name: string;
  photoUrl: string | null;
  bio: string;
  bioEs: string;
  specialties: string[];
  instagram: string;
  /** Already formatted for reading, e.g. "(718) 555-0123"; empty when none. */
  phone: string;
};

const MAX_BIO = 500;
const MAX_SPECIALTIES = 8;
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

type Field = "name" | "instagram" | "phone" | "specialty";

/** "@fresh.cuts", "fresh.cuts" or empty; the engine runs the same check on save. */
const instagramOk = (v: string) => normalizeInstagram(v) !== "invalid";

/**
 * The Profile section (PLAN.md M4 · job 1): photo, name, bio EN/ES, specialties as chips,
 * Instagram and the Owner-only phone, saved together with one button. A new photo replaces the
 * old one in storage only after the save succeeds; an upload that is replaced before saving is
 * deleted right away.
 */
export function ProfileSection({
  shopId,
  barberId,
  locale,
  initial,
}: {
  shopId: string;
  barberId: string;
  locale: Locale;
  initial: ProfileInitial;
}) {
  const p = dictionaries[locale].settings.barberProfile.profile;
  const id = useId();
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [photo, setPhoto] = useState<string | null>(initial.photoUrl);
  const [bio, setBio] = useState(initial.bio);
  const [bioEs, setBioEs] = useState(initial.bioEs);
  const [specialties, setSpecialties] = useState<string[]>(initial.specialties);
  const [draft, setDraft] = useState("");
  const [instagram, setInstagram] = useState(initial.instagram);
  const [phone, setPhone] = useState(initial.phone);
  const [error, setError] = useState<{ text: string; field?: Field } | null>(null);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  const savedPhoto = useRef<string | null>(initial.photoUrl);
  const photoRef = useRef<string | null>(initial.photoUrl);
  const draftRef = useRef<HTMLInputElement>(null);

  const errText = (code: string) => p.errors[code as keyof typeof p.errors] ?? p.errors.UNKNOWN;
  const touched = (field?: Field) => {
    setStatus("");
    if (error && (!field || error.field === field || !error.field)) setError(null);
  };

  function changePhoto(url: string | null) {
    const old = photoRef.current;
    // An upload that was never saved has no owner once it's replaced: delete it now.
    if (old && old !== url && old !== savedPhoto.current) void deleteMediaAction(old).catch(() => {});
    photoRef.current = url;
    setPhoto(url);
    touched();
  }

  /** Add the typed specialty; returns the list it produced (or null when it was refused). */
  function addSpecialty(list = specialties): string[] | null {
    const v = draft.trim().slice(0, 40);
    if (!v) return list;
    if (list.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return list;
    }
    if (list.length >= MAX_SPECIALTIES) {
      setError({ text: p.specialtiesFull, field: "specialty" });
      return null;
    }
    const next = [...list, v];
    setSpecialties(next);
    setDraft("");
    touched("specialty");
    return next;
  }

  function removeSpecialty(i: number) {
    setSpecialties((list) => list.filter((_, j) => j !== i));
    touched("specialty");
    draftRef.current?.focus();
  }

  function save() {
    setStatus("");
    if (!name.trim()) {
      setError({ text: p.errors.NAME_REQUIRED, field: "name" });
      return;
    }
    const list = addSpecialty();
    if (!list) return;
    if (!instagramOk(instagram)) {
      setError({ text: p.errors.INSTAGRAM_INVALID, field: "instagram" });
      return;
    }
    if (phone.trim() && !normalizePhone(phone)) {
      setError({ text: p.errors.PHONE_INVALID, field: "phone" });
      return;
    }
    setError(null);
    start(async () => {
      const res = await updateProfileAction({
        shopId,
        barberId,
        displayName: name,
        bio,
        bioEs,
        specialties: list,
        photoUrl: photo,
        phone,
        instagram: instagram.trim().replace(/^@/, ""),
      }).catch(() => ({ ok: false as const, code: "UNKNOWN" }));
      if (!res.ok) {
        setError({
          text: errText(res.code),
          field: res.code === "PHONE_INVALID" ? "phone" : undefined,
        });
        return;
      }
      const old = savedPhoto.current;
      if (old && old !== photo) void deleteMediaAction(old).catch(() => {});
      savedPhoto.current = photo;
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
      <PhotoInput kind="avatar" shape="circle" value={photo} onChange={changePhoto} label={p.photo} locale={locale} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{p.name}</span>
        <input
          className="field"
          name="name"
          autoComplete="off"
          autoCapitalize="words"
          maxLength={60}
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

      <div className="flex flex-col gap-4">
        <BioField label={p.bioEn} lang="en" value={bio} count={p.count} hintId={`${id}-bio-hint`} onChange={(v) => { setBio(v); touched(); }} />
        <BioField label={p.bioEs} lang="es" value={bioEs} count={p.count} hintId={`${id}-bio-hint`} onChange={(v) => { setBioEs(v); touched(); }} />
        <p id={`${id}-bio-hint`} className="-mt-1 text-sm text-muted">
          {p.bioHint}
        </p>
      </div>

      <div role="group" aria-labelledby={`${id}-spec-label`} className="flex flex-col gap-2">
        <span id={`${id}-spec-label`} className="text-sm font-medium">
          {p.specialties}
        </span>
        {specialties.length > 0 && (
          <ul aria-label={p.specialtiesLabel} className="flex flex-wrap gap-2">
            {specialties.map((s, i) => (
              <li key={s} className="flex min-h-11 items-center gap-1 rounded-full border border-line bg-surface pl-4 text-sm font-medium">
                <span className="min-w-0 break-words">{s}</span>
                <button
                  type="button"
                  aria-label={p.specialtyRemove(s)}
                  onClick={() => removeSpecialty(i)}
                  className={`inline-grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-ink ${focusRing}`}
                >
                  <CloseIcon className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {specialties.length < MAX_SPECIALTIES ? (
          <div className="flex gap-2">
            <input
              ref={draftRef}
              className="field min-w-0 flex-1"
              name="specialty"
              autoComplete="off"
              maxLength={40}
              value={draft}
              aria-label={p.specialtyNew}
              aria-invalid={error?.field === "specialty" || undefined}
              aria-describedby={describe("specialty", `${id}-spec-hint`)}
              onChange={(e) => {
                setDraft(e.target.value);
                touched("specialty");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSpecialty();
                }
              }}
            />
            <button type="button" className="btn-ghost shrink-0 px-5" onClick={() => addSpecialty()}>
              {p.specialtyAdd}
            </button>
          </div>
        ) : null}
        <span id={`${id}-spec-hint`} className="text-sm text-muted">
          {specialties.length < MAX_SPECIALTIES ? p.specialtiesHint : p.specialtiesFull}
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{p.instagram}</span>
        <span className="relative flex">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
            @
          </span>
          <input
            className="field pl-9"
            name="instagram"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={31}
            value={instagram}
            aria-invalid={error?.field === "instagram" || undefined}
            aria-describedby={describe("instagram", `${id}-ig-hint`)}
            onChange={(e) => {
              setInstagram(e.target.value.replace(/^@/, ""));
              touched("instagram");
            }}
            onBlur={() => {
              if (!instagramOk(instagram)) setError({ text: p.errors.INSTAGRAM_INVALID, field: "instagram" });
            }}
          />
        </span>
        <span id={`${id}-ig-hint`} className="text-sm text-muted">
          {p.instagramHint}
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{p.phone}</span>
        <input
          className="field font-mono tabular-nums"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
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

function BioField(props: {
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
        className="field min-h-28 resize-y py-3 leading-relaxed"
        lang={props.lang}
        rows={4}
        maxLength={MAX_BIO}
        value={props.value}
        aria-describedby={`${props.hintId} ${id}-count`}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
