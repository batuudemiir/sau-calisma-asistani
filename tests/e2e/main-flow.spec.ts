import { expect, test, type Browser, type Page } from "@playwright/test";

// Örnek veri (scripts/seed-demo) Salı 13.00 için: Ö-102/Ö-103/Ö-201/Ö-202 programda boş, Ö-204 veri eksik.
const Q = "d=60&at=2026-10-27T13:00";
const room = (code: string) => `/spaces/demo-blok-${encodeURIComponent(`Ö-${code}`)}?${Q}`;
const CRITERIA = ["Sessizlik", "Priz", "İnternet", "Işık"];

async function newPhone(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext(); // ayrı bağlam = ayrı anonim kullanıcı
  return ctx.newPage();
}

async function rate(page: Page, score: number) {
  for (const c of CRITERIA) await page.getByRole("group", { name: c }).getByText(String(score), { exact: true }).click();
  await page.getByRole("button", { name: "Değerlendirmeyi gönder" }).click();
}

const formMessage = (page: Page) => page.locator("form p[aria-live=polite]");
const reportMessage = (page: Page) => page.locator("section p[aria-live=polite]");

test("ana sayfadan süre seçilir, sonuçlar etiket ve kaynakla listelenir", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Şimdi nerede çalışabilirsin?" })).toBeVisible();
  await page.getByRole("link", { name: "60 dakika" }).click();
  await expect(page).toHaveURL(/\/results\?d=60/);

  await page.goto(`/results?${Q}`);
  const card = page.getByRole("listitem").filter({ hasText: "Ö-102" });
  await expect(card.getByText("Programda boş")).toBeVisible();
  await expect(card.getByText("17.00 saatine kadar boş (programa göre)")).toBeVisible();
  await expect(card.getByText("Örnek demo verisi").first()).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Ö-204" }).getByText("Program verisi eksik")).toBeVisible();
  // Dersi olan oda listede yok
  await expect(page.getByRole("listitem").filter({ hasText: "Ö-101" })).toHaveCount(0);
  // Çalışma yerleri: merkez kütüphane ilk kart, diğerleri açılır listede
  const library = page.getByRole("link", { name: /Süleyman Demirel Kütüphanesi/ });
  await expect(library.getByText("Doluluk verisi yok")).toBeVisible();
  await expect(library.getByText("7/24 açık (OpenStreetMap)")).toBeVisible();
  await page.getByText(/Diğer çalışma yerleri/).click();
  await expect(page.getByRole("link", { name: /Taş Kafe/ })).toBeVisible();
});

test("check-in diğer cihazda 5 sn içinde görünür, aynı odaya ikinci bildirim hız sınırına takılır (T18)", async ({ browser }) => {
  const a = await newPhone(browser);
  const b = await newPhone(browser);
  await b.goto(`/results?${Q}`);
  await expect(b.getByRole("listitem").filter({ hasText: "Ö-103" }).getByText("Programda boş")).toBeVisible();

  await a.goto(room("103"));
  await a.getByRole("button", { name: "Buradayım, uygun (check-in)" }).click();
  await expect(reportMessage(a)).toHaveText("Check-in yapıldı, teşekkürler!");

  await expect(b.getByRole("listitem").filter({ hasText: "Ö-103" }).getByText("Öğrenci doğruladı")).toBeVisible({ timeout: 5_000 });

  await a.getByRole("button", { name: "Dolu" }).click();
  await expect(reportMessage(a)).toHaveText("Bu alan için 10 dakikada bir bildirim yapabilirsin");
});

test("değerlendirme check-in ister, check-in başına bir kez; 3 değerlendirmeden sonra haritada ortalama", async ({ browser }) => {
  const scores = [3, 4, 5];
  for (const [i, s] of scores.entries()) {
    const p = await newPhone(browser);
    await p.goto(room("202"));
    if (i === 0) {
      await rate(p, s);
      await expect(formMessage(p)).toHaveText("Değerlendirme için önce bu alanda check-in yapmalısın"); // T19
    }
    await p.getByRole("button", { name: "Buradayım, uygun (check-in)" }).click();
    await expect(reportMessage(p)).toHaveText("Check-in yapıldı, teşekkürler!");
    await rate(p, s);
    await expect(formMessage(p)).toHaveText("Değerlendirmen kaydedildi, teşekkürler!");
    if (i === 0) {
      await rate(p, 1);
      await expect(formMessage(p)).toHaveText("Bu check-in için zaten değerlendirme yaptın"); // T21
      await expect(p.getByText("Henüz yeterli değerlendirme yok (1/3).")).toBeVisible(); // T22
    }
  }

  const map = await newPhone(browser);
  await map.goto(`/map?${Q}&b=demo-blok`);
  await expect(map.locator('a[aria-label^="Ö-202"]')).toHaveAttribute("aria-label", /Ortalama puan 4\.0$/);
});
