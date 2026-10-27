"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { panBy, viewBoxOf, zoomAt, type Box } from "@/lib/pan-zoom";

/** Bu kadar pikselden az hareket dokunma sayılır (bağlantı tıklaması engellenmez). */
const DRAG_THRESHOLD_PX = 6;

/**
 * SVG haritada sürükle (tek parmak/fare), iki parmakla ve tekerlekle yakınlaştır. Paket yok; viewBox güncellenir.
 * Sürükleme sonrası gelen tıklama yutulur, böylece kaydırırken yanlışlıkla binaya girilmez.
 */
export function usePanZoom(svgRef: RefObject<SVGSVGElement | null>, initial: Box, bounds: Box) {
  const [view, setView] = useState(initial);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Ekrandaki boyut: işaretler yakınlaştırmadan bağımsız sabit piksel boyutunda çizilir
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(svg);
    return () => ro.disconnect();
  }, [svgRef]);

  // Ekran pikseli → SVG birimi (preserveAspectRatio dahil, tarayıcının dönüşüm matrisiyle)
  const toSvg = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      const m = svg?.getScreenCTM();
      if (!svg || !m) return { x: 0, y: 0 };
      const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
      return { x: p.x, y: p.y };
    },
    [svgRef],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // Tekerlek olayı pasif olmayan dinleyici ister (sayfa kaymasın)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      setView((v) => zoomAt(v, Math.exp(-e.deltaY * 0.002), p.x, p.y, bounds));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [svgRef, toSvg, bounds]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.size === 0) moved.current = 0;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    moved.current += Math.hypot(cur.x - prev.x, cur.y - prev.y);
    // Eşik aşılınca imleci yakala (öncesinde yakalamak bağlantı tıklamasını bozar)
    if (moved.current > DRAG_THRESHOLD_PX && !e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId);
    if (others.length === 1) {
      // İki parmak: mesafe oranı kadar yakınlaştır, iki parmağın ortası sabit
      const o = others[0][1];
      const before = Math.hypot(prev.x - o.x, prev.y - o.y);
      const after = Math.hypot(cur.x - o.x, cur.y - o.y);
      const mid = toSvg((cur.x + o.x) / 2, (cur.y + o.y) / 2);
      if (before > 0) setView((v) => zoomAt(v, after / before, mid.x, mid.y, bounds));
    } else if (others.length === 0) {
      const a = toSvg(prev.x, prev.y);
      const b = toSvg(cur.x, cur.y);
      setView((v) => panBy(v, b.x - a.x, b.y - a.y, bounds));
    }
    pointers.current.set(e.pointerId, cur);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (moved.current > DRAG_THRESHOLD_PX) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = 0;
    }
  };

  const zoomBy = (factor: number) => setView((v) => zoomAt(v, factor, v.x + v.w / 2, v.y + v.h / 2, bounds));

  return {
    viewBox: viewBoxOf(view),
    /** Bir CSS pikselinin SVG birimi karşılığı (preserveAspectRatio="meet"). */
    px: size.w && size.h ? 1 / Math.min(size.w / view.w, size.h / view.h) : view.w / 360,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture },
    zoomIn: () => zoomBy(1.5),
    zoomOut: () => zoomBy(1 / 1.5),
    show: setView,
  };
}
