"use client";

import { useEffect, useMemo, useState } from "react";
import { googleTileUrl, type TileUrl } from "@/lib/tiles";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
export const GOOGLE_TILES = KEY.length > 0;
const STORE = "google-harita-oturumu";
const API = "https://tile.googleapis.com";
/** Kampüs çevresi: telif metni bu alan için istenir. */
const CAMPUS_VIEW = "north=40.746&south=40.737&east=30.338&west=30.323";

interface Stored {
  session: string;
  /** Oturumun bitişi (ms). */
  expiresMs: number;
  copyright: string;
}

export interface GoogleTiles {
  url: TileUrl;
  copyright: string;
}

function read(): Stored | null {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? "null") as Stored | null;
    // Bitimine bir saatten az kalan oturum yenilenir
    return s && s.expiresMs - Date.now() > 3_600_000 ? s : null;
  } catch {
    return null;
  }
}

async function create(): Promise<Stored> {
  const res = await fetch(`${API}/v1/createSession?key=${encodeURIComponent(KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mapType: "roadmap", language: "tr-TR", region: "TR", scale: "scaleFactor2x", highDpi: true }),
  });
  if (!res.ok) throw new Error(`createSession ${res.status}`);
  const { session, expiry } = (await res.json()) as { session: string; expiry: string };
  const v = await fetch(`${API}/tile/v1/viewport?session=${encodeURIComponent(session)}&key=${encodeURIComponent(KEY)}&zoom=17&${CAMPUS_VIEW}`);
  const copyright = v.ok ? ((await v.json()) as { copyright?: string }).copyright ?? "" : "";
  const stored = { session, expiresMs: Number(expiry) * 1000, copyright: copyright || "Harita verileri © Google" };
  try {
    localStorage.setItem(STORE, JSON.stringify(stored));
  } catch {
    // depolama kapalıysa her açılışta yeni oturum
  }
  return stored;
}

/**
 * Google Map Tiles oturumu. Anahtar tanımlı değilse ya da oturum açılamazsa null döner; harita o zaman CARTO
 * döşemelerini kullanır (hata kullanıcıya gösterilmez, anahtar loglanmaz).
 */
export function useGoogleTiles(): GoogleTiles | null {
  const [s, setS] = useState<Stored | null>(null);
  useEffect(() => {
    if (!GOOGLE_TILES) return;
    let alive = true;
    const cached = read();
    const t = setTimeout(() => {
      if (cached) setS(cached);
      else
        create()
          .then((x) => alive && setS(x))
          .catch(() => alive && setS(null));
    }, 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);
  return useMemo(() => (s ? { url: googleTileUrl(s.session, KEY), copyright: s.copyright } : null), [s]);
}
