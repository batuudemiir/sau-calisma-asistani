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
      <input
        id={`${listId}-input`}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setText("")}
        placeholder="Oda, bina veya yer ara"
        autoComplete="off"
        aria-describedby={`${listId}-count`}
        className="min-h-11 w-full rounded-lg border border-zinc-400 bg-background px-3"
      />
      <p id={`${listId}-count`} aria-live="polite" className="sr-only">
        {text.trim() ? `${hits.length} sonuç` : ""}
      </p>
      {text.trim() && (
        <ul
          aria-label="Arama sonuçları"
          className="mt-1 max-h-72 overflow-y-auto rounded-lg border border-zinc-300 bg-background dark:border-zinc-700"
        >
          {hits.length === 0 && <li className="p-3 text-sm">Sonuç yok. Oda kodunu (ör. Ö-102) veya yer adını dene.</li>}
          {hits.map((h) => {
            const row = (
              <>
                <span className="font-semibold">{h.label}</span>
                <span className="text-xs opacity-70">
                  {TYPE_LABEL[h.type]}
                  {h.context ? ` · ${h.context}` : ""}
                </span>
              </>
            );
            const cls =
              "flex min-h-11 w-full flex-col justify-center px-3 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800";
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
