import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Erişilebilirlik taraması (WCAG 2.2 A/AA kuralları, axe-core): tüm ana rotalar, açık ve koyu tema.
const Q = "d=60&at=2026-10-27T13:00";
const ROUTES = [
  { name: "harita", path: `/?${Q}`, ready: /derslik/ },
  { name: "bina paneli", path: `/?${Q}&b=demo-blok`, ready: "Örnek Blok" },
  { name: "yer paneli", path: `/?${Q}&s=kutuphane-merkez`, ready: /Süleyman Demirel/ },
  { name: "liste", path: `/liste?${Q}`, ready: /çalışabileceğin yerler/ },
  { name: "ayrıntı", path: `/yer/demo-blok-${encodeURIComponent("Ö-102")}?${Q}`, ready: "Ö-102" },
  { name: "profil", path: `/profil?${Q}`, ready: "Puanların" },
  { name: "hakkında", path: "/hakkinda", ready: "Hakkında" },
  { name: "QR", path: `/qr/${encodeURIComponent("demo-blok-Ö-102")}/gecersiz-kod`, ready: "Ö-102" },
];

for (const scheme of ["light", "dark"] as const) {
  for (const r of ROUTES) {
    test(`axe: ${r.name} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto(r.path);
      await expect(page.getByRole("heading", { name: r.ready }).first()).toBeVisible();
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const summary = result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1] ?? ""}`),
      }));
      expect(summary).toEqual([]);
    });
  }
}

test("axe: asistan paneli açık", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/?${Q}`);
  await page.getByRole("button", { name: "Asistan" }).click();
  await page.getByRole("button", { name: "Çalışacak yer bul" }).click();
  await page.getByRole("button", { name: "60 dakika" }).click();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});
