"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { carryQuery } from "@/lib/use-api";

const TABS = [
  { href: "/", label: "Harita", icon: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15", match: (p: string) => p === "/" },
  {
    href: "/liste",
    label: "Liste",
    icon: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
    match: (p: string) => p.startsWith("/liste") || p.startsWith("/yer"),
  },
  {
    href: "/profil",
    label: "Profil",
    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0",
    match: (p: string) => p.startsWith("/profil") || p.startsWith("/hakkinda"),
  },
];

/** Telefonda altta sabit sekme çubuğu, geniş ekranda üst gezinme. Süre ve demo saati sekmeler arasında taşınır. */
export function TabBar() {
  const pathname = usePathname();
  const query = carryQuery(useSearchParams());
  return (
    <nav
      aria-label="Ana gezinme"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-300 bg-background pb-[env(safe-area-inset-bottom)] lg:static lg:order-first lg:border-t-0 lg:border-b lg:pb-0 dark:border-zinc-700"
    >
      <div className="mx-auto flex max-w-md lg:max-w-6xl lg:items-center lg:gap-6 lg:px-8">
        <Link href={`/?${query}`} className="hidden min-h-14 items-center text-lg font-bold lg:mr-auto lg:inline-flex">
          SAÜ Çalışma Asistanı
        </Link>
        <ul className="flex flex-1 lg:flex-none lg:gap-2">
          {TABS.map((t) => {
            const active = t.match(pathname);
            return (
              <li key={t.href} className="flex-1">
                <Link
                  href={`${t.href}?${query}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-3 text-xs lg:flex-row lg:gap-2 lg:text-sm ${active ? "font-bold" : "opacity-70"}`}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={active ? 2.4 : 1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={t.icon} />
                  </svg>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
