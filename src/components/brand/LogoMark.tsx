// Soru pini: konum pini içinde "?" (tasarım paketi assets/logo-mark.svg).
const PIN = "M20 1C9.5 1 1 9.4 1 19.8 1 33.6 20 49 20 49s19-15.4 19-29.2C39 9.4 30.5 1 20 1z";
const Q = "M15.4 15.4a4.8 4.8 0 1 1 6.9 4.3c-1.3.7-2.3 1.6-2.3 3.1v.6";

/** Logo işareti. Açık zeminde kobalt pin + beyaz ?, koyu/kobalt zeminde limon pin + lacivert ?. */
export function LogoMark({ size = 40, inverse = false, className }: { size?: number; inverse?: boolean; className?: string }) {
  const pin = inverse ? "#d9ff3f" : "#1f3fd8";
  const glyph = inverse ? "#0e1636" : "#ffffff";
  return (
    <svg viewBox="0 0 40 50" width={size * 0.8} height={size} aria-hidden="true" className={`block shrink-0 ${className ?? ""}`}>
      <path d={PIN} fill={pin} />
      <path d={Q} fill="none" stroke={glyph} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="28.6" r="2.1" fill={glyph} />
    </svg>
  );
}
