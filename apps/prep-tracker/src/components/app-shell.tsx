"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Workspace", description: "Today’s prep flow" },
  { href: "/frontend", label: "Frontend", description: "Uber frontend bank" },
  { href: "/bps", label: "BPS", description: "Uber phone screen program" },
  { href: "/bank", label: "Master Bank", description: "Canonical prep items" },
  { href: "/goals", label: "Goals", description: "Plans and pacing" },
];

const SECONDARY_NAV: NavItem[] = [{ href: "/items/new", label: "New Item", description: "Capture a new prep item" }];

function matchesRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/frontend") return pathname === "/frontend";
  if (href === "/bps") return pathname === "/bps";
  if (href === "/bank") return pathname === "/bank" || pathname.startsWith("/items/");
  if (href === "/goals") return pathname === "/goals" || pathname.startsWith("/goals/");
  if (href === "/items/new") return pathname === "/items/new";
  return pathname === href;
}

function navTone(active: boolean): string {
  if (active) {
    return "border-emerald-500/60 bg-emerald-950/45 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)]";
  }
  return "border-zinc-800 bg-zinc-950/55 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/90 hover:text-zinc-100";
}

function NavigationRow({ items, pathname, compact = false }: { items: NavItem[]; pathname: string; compact?: boolean }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = matchesRoute(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-2xl border transition ${compact ? "px-3 py-2" : "min-w-[9rem] px-3 py-2.5"} ${navTone(active)}`}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            {!compact && <p className="mt-1 text-[11px] leading-4 text-zinc-400">{item.description}</p>}
          </Link>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const activePrimary = PRIMARY_NAV.find((item) => matchesRoute(pathname, item.href));

  return (
    <div className="mx-auto max-w-[88rem] space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 text-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300 hover:text-emerald-200">
                PrepSprint 60
              </Link>
              {activePrimary && (
                <span className="rounded-full border border-zinc-700 bg-zinc-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  {activePrimary.label}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-400">Local SQLite workspace for focused interview prep.</p>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <div className="min-w-0 flex-1 xl:max-w-[46rem]">
              <NavigationRow items={PRIMARY_NAV} pathname={pathname} compact />
            </div>
            <div className="shrink-0">
              <NavigationRow items={SECONDARY_NAV} pathname={pathname} compact />
            </div>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
