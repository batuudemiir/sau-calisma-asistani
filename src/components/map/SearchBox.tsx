"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { searchItems, type SearchItem } from "@/lib/search";
import type { MapResponse } from "@/server/search-service";
import type { MapSelection } from "./CampusMap";

type Hit = SearchItem & { type: "room" | "building" | "place" };

const TYPE_LABEL: Record<Hit["type"], string> = { room: "Oda", building: "Bina", place: "Çalışma yeri" };

/** Oda, bina ve çalışma yeri araması (istemcide; veri zaten haritayla geldi). */
export function SearchBox({
  data,
  query,
  onSelect,
}: {
  data: MapResponse;
  query: string;
  onSelect: (sel: MapSelection, el: Element) => void;
}) {
  const [text, setText] = useState("");
  const listId = useId();
  const items = useMemo<Hit[]>(
    () => [
      ...data.buildings.flatMap((b) =>
        b.spaces.map((s) => ({ id: s.spaceId, label: s.code, context: b.name, type: "room" as const })),
      ),
      ...data.buildings.map((b) => ({ id: b.id, label: b.name, type: "building" as const })),
      ...data.places.map((p) => ({ id: p.spaceId, label: p.name, type: "place" as const })),
    ],
    [data],
  );
  const hits = searchItems(text, items);
  const done = (sel: MapSelection, el: Element) => {
    setText("");
    onSelect(sel, el);
  };

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Oda, bina veya yer ara
      </label>
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute top-[13px] left-3 text-fg-3"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        id={`${listId}-input`}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setText("")}
        placeholder="Oda, bina veya yer ara"
        autoComplete="off"
        aria-describedby={`${listId}-count`}
        className="min-h-11 w-full rounded-md border border-line-strong bg-card pr-3 pl-9 placeholder:text-fg-3 focus:border-ink-900 focus:outline-2 focus:outline-offset-0 focus:outline-[var(--focus-ring)]"
      />
      <p id={`${listId}-count`} aria-live="polite" className="sr-only">
        {text.trim() ? `${hits.length} sonuç` : ""}
      </p>
      {text.trim() && (
        <ul
          aria-label="Arama sonuçları"
          className="mt-1 max-h-72 overflow-y-auto rounded-md border border-line bg-card shadow-control"
        >
          {hits.length === 0 && <li className="p-3 text-sm">Sonuç yok. Oda kodunu (ör. Ö-102) veya yer adını dene.</li>}
          {hits.map((h) => {
            const row = (
              <>
                <span className="font-semibold">{h.label}</span>
                <span className="text-sm text-fg-3">
                  {TYPE_LABEL[h.type]}
                  {h.context ? ` · ${h.context}` : ""}
                </span>
              </>
            );
            const cls =
              "flex min-h-11 w-full flex-col justify-center px-3 py-1 text-left no-underline hover:bg-cobalt-50 dark:hover:bg-sunken";
            return (
              <li key={`${h.type}-${h.id}`}>
                {h.type === "room" ? (
                  <Link href={`/yer/${encodeURIComponent(h.id)}?${query}`} className={cls}>
                    {row}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={cls}
                    onClick={(e) => done(h.type === "building" ? { b: h.id } : { s: h.id }, e.currentTarget)}
                  >
                    {row}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
