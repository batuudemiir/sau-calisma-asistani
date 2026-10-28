"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import type { StatusCode } from "@/domain/types";
import { statusTitle } from "@/lib/labels";
import {
  campusBoundary,
  campusBounds,
  campusGeoJson,
  campusMarkers,
  centerBounds,
  type MarkerSpec,
  type Selection,
} from "@/lib/map-geojson";
import type { MapResponse } from "@/server/search-service";
import { MapControls } from "./MapControls";

const STYLE = { light: "mapbox://styles/mapbox/light-v11", dark: "mapbox://styles/mapbox/dark-v11" };
/** Bu süre içinde harita yüklenmezse SVG yedeğe geçilir. */
const LOAD_TIMEOUT_MS = 10_000;

// Tailwind sınıfları kaynakta açıkça yazılmalı (derleyici tarar)
const PLACE_RING: Record<StatusCode, string> = {
  VERIFIED_FREE: "border-status-verified-border",
  PROGRAM_FREE: "border-status-program-border",
  UNKNOWN: "border-status-unknown-border",
  REPORTED_BUSY: "border-status-busy-border",
};

/** Tasarım token'ının o anki (açık/koyu) değeri; Mapbox katman renkleri için. */
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const dark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

function addLayers(map: mapboxgl.Map, data: MapResponse, selected: Selection) {
  const fill = (tone: string) => token(`--status-${tone}-bg`);
  const line = (tone: string) => token(`--status-${tone}-border`);
  map.addSource("kampus-sinir", { type: "geojson", data: campusBoundary() });
  map.addSource("binalar", { type: "geojson", data: campusGeoJson(data, selected) });
  map.addLayer({
    id: "kampus-sinir-dolgu",
    type: "fill",
    source: "kampus-sinir",
    paint: { "fill-color": token("--surface-map-campus"), "fill-opacity": 0.55 },
  });
  map.addLayer({
    id: "kampus-sinir-cizgi",
    type: "line",
    source: "kampus-sinir",
    paint: { "line-color": token("--map-boundary"), "line-width": 1.5, "line-dasharray": [4, 3] },
  });
  const toneColor = (pick: (t: string) => string) =>
    [
      "match",
      ["get", "tone"],
      "VERIFIED_FREE",
      pick("verified"),
      "PROGRAM_FREE",
      pick("program"),
      "REPORTED_BUSY",
      pick("busy"),
      pick("unknown"),
    ] as mapboxgl.ExpressionSpecification;
  map.addLayer({
    id: "bina-dolgu",
    type: "fill",
    source: "binalar",
    paint: {
      "fill-color": [
        "match",
        ["get", "role"],
        "other",
        token("--map-building"),
        "guide",
        token("--map-guide-building"),
        toneColor(fill),
      ] as mapboxgl.ExpressionSpecification,
      "fill-opacity": 0.92,
    },
  });
  map.addLayer({
    id: "bina-kenar",
    type: "line",
    source: "binalar",
    filter: ["in", ["get", "role"], ["literal", ["app", "place"]]],
    paint: { "line-color": toneColor(line), "line-width": ["case", ["get", "selected"], 3, 1.5] },
  });
}

/** İşaret görünümü ve erişilebilir adı; mevcut öğe yerinde güncellenir (yoklamada odak kaybolmasın). */
function paintMarker(el: HTMLElement, spec: MarkerSpec) {
  if (spec.kind === "guide") {
    el.setAttribute("aria-hidden", "true");
    el.className =
      "flex size-[18px] items-center justify-center rounded-full border border-ink-900 bg-white text-[10px] font-bold text-ink-900";
    el.textContent = spec.text;
    return;
  }
  el.setAttribute("aria-label", spec.label);
  if (spec.active) el.setAttribute("aria-current", "true");
  else el.removeAttribute("aria-current");
  if (spec.kind === "place") {
    el.className = `flex items-center justify-center rounded-full border-[3px] bg-ink-900 font-display font-bold text-lime-500 shadow-control ${PLACE_RING[spec.tone]} ${spec.active ? "size-8 text-base" : "size-[26px] text-sm"}`;
    el.textContent = spec.letter;
  } else {
    el.className = `flex h-6 min-w-[52px] items-center justify-center rounded-full border px-2 text-xs font-bold shadow-control ${spec.active ? "border-ink-900 bg-ink-900 text-lime-500" : "border-status-program-border bg-status-program-bg text-status-program-fg"}`;
    el.textContent = spec.text;
  }
}

/**
 * Ana harita (Mapbox GL JS). Bina konumları ve sınırları OSM'den (© OpenStreetMap, ODbL); taban harita Mapbox.
 * Kullanıcı konumu Mapbox'a gönderilmez. Yüklenemezse onFail ile SVG yedeğe geçilir.
 */
export function MapboxCampus({
  accessToken,
  data,
  selected,
  onSelect,
  onFail,
  controlsHidden,
}: {
  accessToken: string;
  data: MapResponse;
  selected: Selection;
  onSelect: (sel: Selection, trigger: Element) => void;
  onFail: () => void;
  controlsHidden: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markers = useRef(new Map<string, mapboxgl.Marker>());
  // Olay dinleyicileri her zaman son veriyi ve geri çağrıları görsün
  const latest = useRef({ data, selected, onSelect, onFail });
  // Diğer etkilerden önce çalışır (aynı bileşende tanım sırasıyla)
  useEffect(() => {
    latest.current = { data, selected, onSelect, onFail };
  });

  const specs = useRef(new Map<string, MarkerSpec>());
  const syncMarkers = () => {
    const map = mapRef.current;
    if (!map) return;
    const { data, selected } = latest.current;
    const next = campusMarkers(data, selected, (p) => statusTitle(p.status, true));
    const keep = new Set(next.map((x) => x.key));
    for (const [key, m] of markers.current) {
      if (!keep.has(key)) {
        m.remove();
        markers.current.delete(key);
      }
    }
    for (const spec of next) {
      specs.current.set(spec.key, spec);
      const existing = markers.current.get(spec.key);
      if (existing) {
        paintMarker(existing.getElement(), spec);
        existing.setLngLat(spec.lngLat);
        continue;
      }
      const el = document.createElement(spec.kind === "guide" ? "span" : "button");
      if (el instanceof HTMLButtonElement) el.type = "button";
      paintMarker(el, spec);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const cur = specs.current.get(spec.key);
        if (cur && cur.kind !== "guide") latest.current.onSelect(cur.selection, el);
      });
      markers.current.set(spec.key, new mapboxgl.Marker({ element: el }).setLngLat(spec.lngLat).addTo(map));
    }
  };

  useEffect(() => {
    if (!container.current) return;
    let loaded = false;
    const fail = () => {
      if (!loaded) latest.current.onFail();
    };
    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: container.current,
        accessToken,
        style: dark() ? STYLE.dark : STYLE.light,
        bounds: centerBounds(latest.current.data),
        fitBoundsOptions: { padding: 24 },
        attributionControl: true,
        customAttribution: "Bina konumları © OpenStreetMap katkıda bulunanlar (ODbL)",
        pitchWithRotate: false,
        dragRotate: false,
      });
    } catch {
      latest.current.onFail();
      return;
    }
    mapRef.current = map;
    const timer = setTimeout(fail, LOAD_TIMEOUT_MS);
    map.on("error", fail);
    // style.load: ilk yüklemede ve tema değişince (setStyle) katmanlar yeniden eklenir
    map.on("style.load", () => {
      addLayers(map, latest.current.data, latest.current.selected);
      syncMarkers();
    });
    map.on("load", () => {
      loaded = true;
      clearTimeout(timer);
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onTheme = () => map.setStyle(media.matches ? STYLE.dark : STYLE.light);
    media.addEventListener("change", onTheme);
    const current = markers.current;
    return () => {
      clearTimeout(timer);
      media.removeEventListener("change", onTheme);
      current.forEach((m) => m.remove());
      current.clear();
      map.remove();
      mapRef.current = null;
    };
    // Harita bir kez kurulur; veri değişimi aşağıdaki etkiyle işlenir (son değerler latest ref üzerinden)
  }, [accessToken]);

  const selKey = `${selected.b ?? ""}|${selected.s ?? ""}`;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const { data, selected } = latest.current;
    (map.getSource("binalar") as mapboxgl.GeoJSONSource | undefined)?.setData(campusGeoJson(data, selected));
    syncMarkers();
  }, [data, selKey]);

  const fit = (b: [[number, number], [number, number]]) => mapRef.current?.fitBounds(b, { padding: 24 });
  return (
    <div className="relative h-full w-full bg-map">
      {/* Telefonda alt panelin (256 px) altında kalmasın: Mapbox logosu ve atıf görünür kalır */}
      <div
        ref={container}
        className="absolute inset-x-0 top-0 bottom-64 lg:bottom-0"
        role="region"
        aria-label="Esentepe kampüsü haritası (Mapbox). Bina ve çalışma yeri işaretleri düğmedir; aynı bilgi alttaki listede de var."
      />
      <MapControls
        hidden={controlsHidden}
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onCenter={() => fit(centerBounds(latest.current.data))}
        onAll={() => fit(campusBounds())}
      />
    </div>
  );
}
