"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Selection } from "@/lib/map-geojson";
import type { MapResponse } from "@/server/search-service";
import { SvgCampusMap } from "./SvgCampusMap";

export { GUIDE } from "@/lib/map-geojson";
export type MapSelection = Selection;

// Mapbox yalnızca harita açılınca yüklenir (diğer sayfaların paketine girmez)
const MapboxCampus = dynamic(() => import("./MapboxCampus").then((m) => m.MapboxCampus), { ssr: false });

// Public "pk." token'ı; gizli değildir (Mapbox hesabında alan adı kısıtlamasıyla korunur)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Ana harita: Mapbox (token ve WebGL varsa); token yoksa, WebGL yoksa veya Mapbox yüklenemezse
 * el çizimi SVG yedek harita. İkisi de aynı seçim (b/s) ve panel akışını kullanır.
 */
export function CampusMap(props: {
  data: MapResponse;
  query: string;
  selected: MapSelection;
  onSelect: (sel: MapSelection, trigger: Element) => void;
  controlsHidden?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  // Bu bileşen yalnızca istemcide, veri geldikten sonra çizilir; WebGL denetimi burada güvenli
  const [webgl] = useState(() => typeof document !== "undefined" && hasWebGL());
  if (!MAPBOX_TOKEN || !webgl || failed) return <SvgCampusMap {...props} />;
  return (
    <MapboxCampus
      accessToken={MAPBOX_TOKEN}
      data={props.data}
      selected={props.selected}
      onSelect={props.onSelect}
      onFail={() => setFailed(true)}
      controlsHidden={props.controlsHidden ?? false}
    />
  );
}
