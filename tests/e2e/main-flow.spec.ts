import { expect, test, type Browser, type Page } from "@playwright/test";

// Örnek veri (scripts/seed-demo) Salı 13.00 için: Ö-102/Ö-103/Ö-201/Ö-202 programda boş, Ö-204 veri eksik.
const Q = "d=60&at=2026-10-27T13:00";
const room = (code: string) => `/yer/demo-blok-${encodeURIComponent(`Ö-${code}`)}?${Q}`;
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

test("harita ana ekran, sekmeler sorguyu taşır, eski bağlantılar yönlendirilir", async ({ page }) => {
  await page.goto(`/?${Q}`);
  await expect(page.getByRole("heading", { level: 1, name: "Kampüs haritası" })).toBeVisible();
  const tabs = page.getByRole("navigation", { name: "Ana gezinme" });
  await expect(tabs.getByRole("link", { name: "Harita" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "90 dk", exact: true }).click();
  await expect(page).toHaveURL(/\/\?d=90/);
  await tabs.getByRole("link", { name: "Liste" }).click();
  await expect(page).toHaveURL(/\/liste\?d=90/);
  await expect(page.getByRole("heading", { level: 1, name: "90 dakika çalışabileceğin yerler" })).toBeVisible();
  await tabs.getByRole("link", { name: "Profil" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Profil" })).toBeVisible();
  await page.getByRole("link", { name: /Hakkında/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hakkında" })).toBeVisible();

  await page.goto(`/results?${Q}`);
  await expect(page).toHaveURL(/\/liste\?d=60&at=2026-10-27T13(:|%3A)00$/);
  await page.goto(`/spaces/demo-blok-${encodeURIComponent("Ö-102")}?${Q}`);
  await expect(page).toHaveURL(/\/yer\/demo-blok-/);
  await expect(page.getByRole("heading", { level: 1, name: "Ö-102" })).toBeVisible();
  await page.goto(`/map?${Q}`);
  await expect(page).toHaveURL(/127\.0\.0\.1:3000\/\?d=60&at=2026-10-27T13(:|%3A)00$/);
  await expect(page.getByRole("heading", { level: 1, name: "Kampüs haritası" })).toBeVisible();

  // İçeriğe atla: klavyede ilk odak
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "İçeriğe atla" })).toBeFocused();
});

test("liste: sonuçlar etiket ve kaynakla listelenir", async ({ page }) => {
  await page.goto(`/liste?${Q}`);
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
  await b.goto(`/liste?${Q}`);
  await expect(b.getByRole("listitem").filter({ hasText: "Ö-103" }).getByText("Programda boş")).toBeVisible();

  await a.goto(room("103"));
  await a.getByRole("button", { name: "Buradayım, uygun (check-in)" }).click();
  await expect(reportMessage(a)).toHaveText("Check-in yapıldı, teşekkürler!");

  await expect(b.getByRole("listitem").filter({ hasText: "Ö-103" }).getByText("Öğrenci doğruladı")).toBeVisible({
    timeout: 5_000,
  });

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
  await map.goto(`/?${Q}&b=demo-blok`);
  await expect(map.locator('a[aria-label^="Ö-202 "]')).toHaveAttribute("aria-label", /Ortalama puan 4\.0$/);
});

test("harita: işarete dokununca yer paneli açılır, hızlı check-in panelde ve listede görünür", async ({ browser }) => {
  const a = await newPhone(browser);
  await a.goto(`/?${Q}`);
  await expect(a.getByRole("heading", { level: 2, name: /derslik uygun görünüyor/ })).toBeVisible();
  await a.locator('a[aria-label^="Taş Kafe"]').click();
  await expect(a).toHaveURL(/s=tas-kafe/);
  const panel = a.getByRole("dialog", { name: "Taş Kafe" });
  await expect(panel.getByRole("heading", { name: "Taş Kafe" })).toBeFocused();
  await panel.getByRole("button", { name: "Buradayım, uygun (check-in)" }).click();
  await expect(panel.getByText("Check-in yapıldı, teşekkürler!")).toBeVisible();
  await expect(panel.getByText("Öğrenci doğruladı")).toBeVisible({ timeout: 5_000 });

  const b = await newPhone(browser);
  await b.goto(`/liste?${Q}`);
  await b.getByText(/Diğer çalışma yerleri/).click();
  await expect(b.getByRole("link", { name: /Taş Kafe/ }).getByText("Öğrenci doğruladı")).toBeVisible({ timeout: 5_000 });

  // Esc paneli kapatır, özet geri gelir
  await panel.getByRole("button", { name: "Kapat" }).focus();
  await a.keyboard.press("Escape");
  await expect(a.getByRole("dialog")).toHaveCount(0);
  await expect(a).not.toHaveURL(/s=tas-kafe/);
});

test("arama Türkçe karakter katlar, filtre puansızı dışarıda bırakır ve sekmeler arasında taşınır", async ({ page }) => {
  await page.goto(`/?${Q}`);
  await page.getByRole("searchbox", { name: "Oda, bina veya yer ara" }).fill("o102");
  await page.getByRole("list", { name: "Arama sonuçları" }).getByRole("link", { name: /Ö-102/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ö-102" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bu yeri paylaş" })).toBeVisible();

  await page.goto(`/?${Q}`);
  await page.getByRole("searchbox", { name: "Oda, bina veya yer ara" }).fill("kutuphane");
  await page.getByRole("button", { name: /^Kütüphane Ek Bina/ }).click();
  await expect(page.getByRole("dialog", { name: "Kütüphane Ek Bina" })).toBeVisible();

  await page.goto(`/liste?${Q}`);
  await expect(page.getByRole("listitem").filter({ hasText: "Ö-204" })).toHaveCount(1);
  await page.getByRole("button", { name: "Sessiz" }).click();
  await expect(page).toHaveURL(/f=quiet/);
  await expect(page.getByRole("button", { name: "Sessiz" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("listitem").filter({ hasText: "Ö-204" })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Ana gezinme" }).getByRole("link", { name: "Harita" }).click();
  await expect(page).toHaveURL(/f=quiet/);
});

test("puan: check-in +5, profilde görünür; SAÜ dışı Google reddedilir, öğrenci hesabına bağlanınca puan korunur", async ({
  browser,
}) => {
  const p = await newPhone(browser);
  await p.goto(`/?${Q}&s=kantin`);
  const panel = p.getByRole("dialog", { name: "Kantin" });
  await panel.getByRole("button", { name: "Buradayım, uygun (check-in)" }).click();
  await expect(panel.getByText("+5 puan kazandın")).toBeVisible();

  await p.getByRole("navigation", { name: "Ana gezinme" }).getByRole("link", { name: "Profil" }).click();
  await expect(p.getByRole("heading", { name: "Katkıların bu cihazda anonim" })).toBeVisible();
  await expect(p.getByTestId("level")).toHaveText("Yeni");
  await expect(p.getByTestId("points")).toHaveText("5");
  await expect(p.getByRole("listitem").filter({ hasText: "Check-in · Kantin" })).toContainText("+5");

  await p.evaluate(() => (window.__fakeGoogleEmail = "biri@gmail.com"));
  await p.getByRole("button", { name: "SAÜ hesabıyla giriş yap (Google)" }).click();
  await expect(p.getByText(/Yalnızca SAÜ öğrenci hesabı/)).toBeVisible();
  await expect(p.getByRole("heading", { name: "Katkıların bu cihazda anonim" })).toBeVisible();

  await p.evaluate(() => (window.__fakeGoogleEmail = "b221210001@ogr.sakarya.edu.tr"));
  await p.getByRole("button", { name: "SAÜ hesabıyla giriş yap (Google)" }).click();
  await expect(p.getByRole("heading", { name: "SAÜ öğrenci hesabı" })).toBeVisible();
  await expect(p.getByText("b221210001@ogr.sakarya.edu.tr")).toBeVisible();
  await expect(p.getByTestId("points")).toHaveText("5"); // girişten önceki puan korunur

  await p.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(p.getByRole("heading", { name: "Katkıların bu cihazda anonim" })).toBeVisible();
});

test("hesap silme: puan ve geçmiş silinir, bildirim topluluk verisi olarak kalır", async ({ browser }) => {
  const p = await newPhone(browser);
  await p.goto(`/?${Q}&s=kampus-kafeterya`);
  const panel = p.getByRole("dialog", { name: "Kampüs Kafeterya" });
  await panel.getByRole("button", { name: "Buradayım, uygun (check-in)" }).click();
  await expect(panel.getByText("+5 puan kazandın")).toBeVisible();

  await p.goto(`/profil?${Q}`);
  await expect(p.getByTestId("points")).toHaveText("5");
  await p.getByRole("button", { name: "Hesabımı sil" }).click();
  await p.getByRole("button", { name: "Evet, kalıcı olarak sil" }).click();
  await expect(p.getByText(/Hesabın ve kişisel verilerin silindi/)).toBeVisible();
  await expect(p.getByTestId("points")).toHaveText("0");
  await expect(p.getByText(/Henüz katkın yok/)).toBeVisible();

  await p.goto(`/?${Q}&s=kampus-kafeterya`);
  await expect(p.getByRole("dialog", { name: "Kampüs Kafeterya" }).getByText("Öğrenci doğruladı")).toBeVisible();
});
