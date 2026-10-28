"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { carryQuery } from "@/lib/use-api";
import { Wordmark } from "../brand/Wordmark";

// Lucide map / list / user yolları
const TABS = [
  {
    href: "/",
    label: "Harita",
    icon: "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z M15 5.764v15 M9 3.236v15",
    match: (p: string) => p === "/",
  },
  {
    href: "/liste",
    label: "Liste",
    icon: "M3 12h.01 M3 18h.01 M3 6h.01 M8 12h13 M8 18h13 M8 6h13",
    match: (p: string) => p.startsWith("/liste") || p.startsWith("/yer"),
  },
  {
    href: "/profil",
    label: "Profil",
    icon: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    match: (p: string) => p.startsWith("/profil") || p.startsWith("/hakkinda"),
  },
];

/** Telefonda altta sabit sekme çubuğu, geniş ekranda üst gezinme. Süre, filtre ve demo saati sekmeler arasında taşınır. */
export function TabBar() {
  const pathname = usePathname();
  const query = carryQuery(useSearchParams());
  return (
    <nav
      aria-label="Ana gezinme"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:static lg:order-first lg:border-t-0 lg:border-b lg:pb-0"
    >
      <div className="mx-auto flex max-w-md lg:max-w-6xl lg:items-center lg:gap-6 lg:px-8">
        <Link href={`/?${query}`} className="hidden min-h-14 items-center no-underline lg:mr-auto lg:inline-flex">
          <Wordmark size={22} />
        </Link>
        <ul className="flex flex-1 lg:flex-none lg:gap-2">
          {TABS.map((t) => {
            const active = t.match(pathname);
            return (
              <li key={t.href} className="flex-1">
                <Link
                  href={`${t.href}?${query}`}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-3 text-xs no-underline lg:flex-row lg:gap-2 lg:text-sm ${active ? "font-bold text-fg-1" : "font-medium text-fg-3"}`}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-[25%] top-0 h-[3px] rounded-full bg-accent lg:top-auto lg:bottom-0"
                    />
                  )}
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
