"use client";

import { useEffect, useState } from "react";
import { currentTheme, setTheme, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; hint: string }[] = [
  { value: "light", label: "Açık", hint: "Önerilen; gün ışığında daha okunaklı" },
  { value: "dark", label: "Koyu", hint: "Gece ve düşük ışıkta" },
];

/** Görünüm seçimi: varsayılan açık; seçim yalnızca bu cihazda saklanır. */
export function ThemeSetting() {
  const [theme, set] = useState<Theme>("light");
  useEffect(() => {
    // Satır içi betiğin uyguladığı temayı oku (sunucu çıktısı her zaman açık)
    const t = setTimeout(() => set(currentTheme()), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <fieldset className="space-y-2 rounded-lg border border-line bg-card p-4">
      <legend className="px-1 font-display text-xl font-bold">Görünüm</legend>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((o) => (
          <label key={o.value} className="block">
            <input
              type="radio"
              name="tema"
              value={o.value}
              checked={theme === o.value}
              onChange={() => {
                setTheme(o.value);
                set(o.value);
              }}
              className="peer sr-only"
            />
            <span className="flex min-h-14 cursor-pointer flex-col justify-center rounded-md border border-line-strong bg-card px-3 py-2 peer-checked:border-2 peer-checked:border-ink-900 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus-ring)] dark:peer-checked:border-lime-500">
              <span className="font-semibold">
                {theme === o.value && <span aria-hidden="true">✓ </span>}
                {o.label}
              </span>
              <span className="text-sm text-fg-2">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
