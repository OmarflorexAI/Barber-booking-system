import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HtmlLang } from "@/app/_landing/html-lang";
import { Wordmark } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShellMain, SidebarAdminLink, SidebarNav, TabBar, type NavItem } from "./nav";
import { SIDEBAR_COOKIE, SidebarToggle } from "./sidebar";
import { SignOutButton } from "./sign-out";
import { getShellContext, navFor } from "./staff";

/**
 * The frame every /app screen sits in (DESIGN.md → "Navigation per role"):
 * - phones (< 1024px): a compact header (Shop name left; language + theme right) and the
 *   bottom tab bar;
 * - desktop (≥ 1024px): a left sidebar (the hide/show button, Wordmark, Shop name, the same
 *   items, then the Platform admin link, the person's name and the toggles at its foot). It
 *   collapses to an icon rail (button or `[`), saved in the `sidebar` cookie; the CSS lives
 *   in globals.css → "Staff app sidebar", the behavior in sidebar.tsx.
 * Content goes in <main>, which reserves room for the tab bar. Sign out is not here: it
 * sits at the bottom of Me (Barber) and Settings (Owner).
 */
export async function StaffShell({ children }: { children: React.ReactNode }) {
  const [{ staff, locale, t }, cookieStore] = await Promise.all([getShellContext(), cookies()]);
  if (!staff) redirect("/login");
  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed";

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
    <div className="shell min-h-dvh [--tabbar-h:4rem] [--shell-bottom:calc(var(--tabbar-h)_+_env(safe-area-inset-bottom))] lg:[--shell-bottom:0px] lg:[--tabbar-h:0px]">
      <HtmlLang lang={locale} />

      {/* Desktop sidebar: a fixed 16rem panel, clipped to a 72px icon rail when collapsed.
          Everything that stays visible in the rail sits in its first 72px (icons centered at 36px). */}
      <aside id="app-sidebar" className="shell-aside hidden h-dvh flex-col gap-6 overflow-y-auto overflow-x-hidden bg-surface px-3 py-5 lg:flex">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-0.5 pl-0.5">
            <SidebarToggle controls="app-sidebar" initialCollapsed={collapsed} hideLabel={t.shell.hideSidebar} showLabel={t.shell.showSidebar} />
            {/* The mark's red pivot cuts its ring out in --paper; here it sits on --surface. */}
            <span className="rail-fade text-ink [--paper:var(--surface)]">
              <Wordmark />
            </span>
          </div>
          <p className="rail-fade truncate pl-12 text-sm font-medium text-muted">{staff.membership.shopName}</p>
        </div>
        <SidebarNav items={items} label={t.shell.navLabel} initialCollapsed={collapsed} />
        <div className="mt-auto flex flex-col gap-4">
          {staff.isPlatformAdmin && <SidebarAdminLink label={t.shell.platformAdmin} initialCollapsed={collapsed} />}
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            {person && <p className="rail-fade truncate px-3 text-sm text-muted">{person}</p>}
            {/* Theme first: it fits the rail; the language pill doesn't, so it fades out there. */}
            <div className="flex items-center gap-2 pl-0.5">
              <ThemeToggle label={t.themeDark} />
              <div className="rail-hide">
                <LanguageToggle locale={locale} label={t.otherLang} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="shell-content flex min-h-dvh min-w-0 flex-col">
        {/* Phone header. */}
        <header className="flex min-h-14 items-center justify-between gap-3 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 lg:hidden">
          <p className="min-w-0 truncate text-base font-semibold tracking-[-0.01em]">{staff.membership.shopName}</p>
          {toggles}
        </header>

        <ShellMain className="flex min-w-0 flex-1 flex-col px-4 pt-2 pb-[calc(var(--shell-bottom)_+_1.5rem)] lg:px-8 lg:py-8">{children}</ShellMain>
      </div>

      <TabBar items={items} label={t.shell.navLabel} />
    </div>
  );
}
