import { LogoMark } from "./LogoMark";

/**
 * Logo: "neredeçalışalım" (Zilla Slab 700, küçük harf, bitişik) + soru pini.
 * plain: açık zemin · sign: kobalt kapsül içinde (limon pin).
 */
export function Wordmark({ size = 20, variant = "plain" }: { size?: number; variant?: "plain" | "sign" }) {
  const sign = variant === "sign";
  return (
    <span
      role="img"
      aria-label="neredeçalışalım"
      className={`inline-flex items-center ${sign ? "rounded-full bg-cobalt-500 text-white" : "text-fg-1"}`}
      style={{ gap: size * 0.12, padding: sign ? `${size * 0.32}px ${size * 0.5}px` : undefined }}
    >
      <span
        className="font-display font-bold whitespace-nowrap"
        style={{ fontSize: size, lineHeight: 1, letterSpacing: "-0.015em" }}
      >
        neredeçalışalım
      </span>
      <LogoMark size={size * 1.05} inverse={sign} className="-mt-[0.12em]" />
    </span>
  );
}
