/**
 * Görünüm: varsayılan açık tema (okunabilirlik). Koyu tema yalnızca kullanıcı Profil'den seçerse; seçim
 * yalnızca bu cihazda (localStorage) tutulur, sunucuya gitmez.
 */
export type Theme = "light" | "dark";
export const THEME_KEY = "tema";

/** Sayfa çizilmeden önce çalışan satır içi betik (koyu seçildiyse açık temanın bir an görünmesini önler). */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  if (theme === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  try {
    if (theme === "dark") localStorage.setItem(THEME_KEY, "dark");
    else localStorage.removeItem(THEME_KEY);
  } catch {
    // Gizli sekme vb.: seçim yalnızca bu oturumda geçerli
  }
}
