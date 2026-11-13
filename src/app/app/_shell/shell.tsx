import Link from "next/link";
import { redirect } from "next/navigation";
import { HtmlLang } from "@/app/_landing/html-lang";
import { Wordmark } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavIcon } from "./icons";
import { SidebarNav, TabBar, type NavItem } from "./nav";
import { SignOutButton } from "./sign-out";
import { getShellContext, navFor } from "./staff";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * The frame every /app screen sits in (DESIGN.md → "Navigation per role"):
 * - phones (< 1024px): a compact header (Shop name left; language + theme right) and the
 *   bottom tab bar;
 * - desktop (≥ 1024px): a left sidebar (Wordmark, Shop name, the same items, then the
 *   Platform admin link, the person's name and the toggles at its foot).
 * Content goes in <main>, which reserves room for the tab bar. Sign out is not here: it
 * sits at the bottom of Me (Barber) and Settings (Owner).
 */
export async function StaffShell({ children }: { children: React.ReactNode }) {
  const { staff, locale, t } = await getShellContext();
  if (!staff) redirect("/login");

  const toggles = (
    <div className="flex shrink-0 items-center gap-2">
      <LanguageToggle locale={locale} label={t.otherLang} />
      <ThemeToggle label={t.themeDark} />
    </div>
  );

  // Signed in, but not on any Shop's staff: one calm sentence and the way out.
  if (!staff.membership) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4">
        <HtmlLang lang={locale} />
        <header className="flex items-center justify-between gap-3 py-4">
          <Wordmark />
          {toggles}
        </header>
        <main className="flex flex-1 flex-col justify-center gap-6 pb-16">
          <h1 className="text-lg leading-relaxed font-normal text-pretty">{staff.isPlatformAdmin ? t.shell.adminNoShop : t.shell.noShop}</h1>
          <div className="flex flex-col gap-3">
            {staff.isPlatformAdmin && (
              <Link href="/admin" className="btn-primary">
                {t.shell.platformAdmin}
              </Link>
            )}
            <SignOutButton label={t.signOut} />
          </div>
          {/* The page segment still renders (Next validates every segment for instant
              navigation); pages return null when there's no membership. */}
          {children}
        </main>
      </div>
    );
  }

  const items: NavItem[] = navFor(staff).map((i) => ({ ...i, label: t.shell.nav[i.key] }));
  const person = staff.barber?.displayName ?? staff.email;

  return (
    <div className="min-h-dvh [--tabbar-h:4rem] [--shell-bottom:calc(var(--tabbar-h)_+_env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:[--shell-bottom:0px] lg:[--tabbar-h:0px]">
      <HtmlLang lang={locale} />

      {/* Desktop sidebar. */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-4 py-6 lg:flex">
        <div className="flex flex-col gap-3 px-3">
          {/* The mark's red pivot cuts its ring out in --paper; here it sits on --surface. */}
          <span className="text-ink [--paper:var(--surface)]">
            <Wordmark />
          </span>
          <p className="text-sm font-medium text-muted">{staff.membership.shopName}</p>
        </div>
        <SidebarNav items={items} label={t.shell.navLabel} />
        <div className="mt-auto flex flex-col gap-4">
          {staff.isPlatformAdmin && (
            <Link
              href="/admin"
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium text-muted transition-colors hover:bg-raised hover:text-ink ${focusRing}`}
            >
              <NavIcon name="admin" />
              {t.shell.platformAdmin}
            </Link>
          )}
          <div className="flex flex-col gap-3 border-t border-line px-3 pt-4">
            {person && <p className="truncate text-sm text-muted">{person}</p>}
            {toggles}
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        {/* Phone header. */}
        <header className="flex min-h-14 items-center justify-between gap-3 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 lg:hidden">
          <p className="min-w-0 truncate text-base font-semibold tracking-[-0.01em]">{staff.membership.shopName}</p>
          {toggles}
        </header>

        <main className="flex min-w-0 flex-1 flex-col px-4 pt-2 pb-[calc(var(--shell-bottom)_+_1.5rem)] lg:px-8 lg:py-8">{children}</main>
      </div>

      <TabBar items={items} label={t.shell.navLabel} />
    </div>
  );
}
