"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string | null;
};

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Workspace", description: "Today’s prep flow" },
  { href: "/frontend", label: "Frontend", description: "Uber frontend bank" },
  { href: "/bank", label: "Master Bank", description: "Canonical prep items" },
  { href: "/goals", label: "Goals", description: "Plans and pacing" },
  { href: "/legacy", label: "Legacy", description: "Older dashboard surface" },
];

const SECONDARY_NAV: NavItem[] = [{ href: "/items/new", label: "New Item", description: "Create a private prep item" }];

function matchesRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/frontend") return pathname === "/frontend";
  if (href === "/bank") return pathname === "/bank" || pathname.startsWith("/items/");
  if (href === "/goals") return pathname === "/goals" || pathname.startsWith("/goals/");
  if (href === "/legacy") return pathname === "/legacy";
  if (href === "/items/new") return pathname === "/items/new";
  return pathname === href;
}

function navTone(active: boolean): string {
  if (active) {
    return "border-emerald-500/60 bg-emerald-950/45 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)]";
  }
  return "border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100";
}

function NavigationRow({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = matchesRoute(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`min-w-[9rem] rounded-2xl border px-3 py-2.5 transition ${navTone(active)}`}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="mt-1 text-[11px] leading-4 text-zinc-400">{item.description}</p>
          </Link>
        );
      })}
    </div>
  );
}

export function AppShell({ children, userEmail }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-[88rem] space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-zinc-900/85 px-4 py-4 text-zinc-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300 hover:text-emerald-200">
              PrepSprint 60
            </Link>
            <p className="mt-2 text-base font-medium text-zinc-100">Signed in as {userEmail ?? "unknown user"}</p>
            <p className="text-sm text-zinc-400">Shared bank, personal progress, goals, notes, and practice flows.</p>
          </div>

          <form action="/auth/signout" method="post">
            <button type="submit" className="rounded-xl border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500">
              Sign out
            </button>
          </form>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Main Pages</p>
            <NavigationRow items={PRIMARY_NAV} pathname={pathname} />
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Actions</p>
            <NavigationRow items={SECONDARY_NAV} pathname={pathname} />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
