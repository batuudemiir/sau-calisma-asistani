import { expect, test, type Browser, type Page } from "@playwright/test";

// Örnek veri (scripts/seed-demo) Salı 13.00 için: BB-102, BB-204, FE-103, M2-203 programda boş (17.00'ye kadar,
// değerlendirmesiz), BB-101 derste, HF-201 program verisi eksik. Bellek modundaki "x dk önce" bildirimleri bu
// odalara düşmez (memory-backend DEMO_REPORTS).
const Q = "d=60&at=2026-10-27T13:00";
const roomId = (building: string, code: string) => `${building}-${code}`;
const room = (building: string, code: string) => `/yer/${encodeURIComponent(roomId(building, code))}?${Q}`;
const CRITERIA = ["Sessizlik", "Priz", "İnternet", "Işık"];

async function newPhone(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext(); // ayrı bağlam = ayrı anonim kullanıcı
  return ctx.newPage();
}

async function rate(page: Page, score: number) {
  // Puanlama formu ayrıntı sayfasında "Burayı puanla" açılır bölümünde
  const details = page.locator("details", { has: page.locator("summary", { hasText: "Burayı puanla" }) });
  if (!(await details.evaluate((d) => (d as HTMLDetailsElement).open))) await details.locator("summary").click();
  for (const c of CRITERIA) await page.getByRole("group", { name: c }).getByText(String(score), { exact: true }).click();
  await page.getByRole("button", { name: "Değerlendirmeyi gönder" }).click();
}

const formMessage = (page: Page) => page.locator("form p[aria-live=polite]");
const reportMessage = (page: Page) => page.locator("section p[aria-live=polite]");
const freeList = (page: Page) => page.getByRole("list", { name: "Boş sınıflar" });

test("ana sayfa Şimdi, sekmeler sorguyu taşır, eski bağlantılar yönlendirilir", async ({ page }) => {
  await page.goto(`/?${Q}`);
  await expect(page.getByRole("heading", { level: 1, name: "Ne zaman çalışacaksın?" })).toBeVisible();
  // Seçilen aralık: seçicinin özeti ve sonuç başlığı
  const when = page.getByRole("group", { name: "Ne zaman" });
  await expect(when.getByText("13.00 → 14.00")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /13\.00–14\.00 arası boş sınıflar/ })).toBeVisible();
  const tabs = page.getByRole("navigation", { name: "Ana gezinme" });
  await expect(tabs.getByRole("link", { name: "Şimdi" })).toHaveAttribute("aria-current", "page");
  // Süre 1,5 sa → d=90; özet ve çip güncellenir
  await when.getByRole("group", { name: "Süre" }).getByRole("button", { name: "1,5 sa" }).click();
  await expect(page).toHaveURL(/\/\?d=90&at=2026-10-27T13/);
  await expect(when.getByText("13.00 → 14.30")).toBeVisible();
  await expect(when.getByRole("group", { name: "Süre" }).getByRole("button", { name: "1,5 sa" })).toHaveAttribute("aria-pressed", "true");
  // Gün değişince başlangıç ve süre korunur
  await when.getByRole("group", { name: "Gün" }).getByRole("button", { name: "Yarın" }).click();
  await expect(page).toHaveURL(/d=90&at=\d{4}-\d{2}-\d{2}T13(:|%3A)00/);
  await expect(when.getByRole("group", { name: "Gün" }).getByRole("button", { name: "Yarın" })).toHaveAttribute("aria-pressed", "true");
  // Başlangıç saati çipi
  await when.getByRole("group", { name: "Başlangıç" }).getByRole("button", { name: "15.00" }).click();
  await expect(page).toHaveURL(/at=\d{4}-\d{2}-\d{2}T15(:|%3A)00/);
  await expect(when.getByText("15.00 → 16.30")).toBeVisible();
  // Bugün: başlangıç "Şimdi", at silinir
  await when.getByRole("group", { name: "Gün" }).getByRole("button", { name: "Bugün" }).click();
  await expect(page).not.toHaveURL(/at=/);
  await expect(when.getByRole("group", { name: "Başlangıç" }).getByRole("button", { name: /^Şimdi/ })).toHaveAttribute("aria-pressed", "true");
  await page.goto(`/?d=90&at=2026-10-27T13:00`);
  await tabs.getByRole("link", { name: "Harita" }).click();
  await expect(page).toHaveURL(/\/harita\?d=90/);
  await expect(page.getByRole("heading", { level: 1, name: "Kampüs haritası" })).toBeAttached();
  await tabs.getByRole("link", { name: "Profil" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Profil" })).toBeVisible();
  await page.getByRole("link", { name: /Hakkında/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hakkında" })).toBeVisible();

  await page.goto(`/liste?${Q}`);
  await expect(page).toHaveURL(/127\.0\.0\.1:3000\/\?d=60&at=2026-10-27T13(:|%3A)00$/);
  await page.goto(`/results?${Q}`);
  await expect(page).toHaveURL(/127\.0\.0\.1:3000\/\?d=60/);
  await page.goto(`/spaces/${encodeURIComponent(roomId("bilisim-fakultesi", "BB-102"))}?${Q}`);
  await expect(page).toHaveURL(/\/yer\/bilisim-fakultesi-BB-102/);
  await expect(page.getByRole("heading", { level: 1, name: "BB-102" })).toBeVisible();
  // Sınıfın binasına Google Haritalar'da yürüyerek yol tarifi (yeni sekmede)
  const directions = page.getByRole("link", { name: /Google Haritalar'da yol tarifi/ });
  await expect(directions).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=40\.\d+,30\.\d+&travelmode=walking$/);
  await expect(directions).toHaveAttribute("target", "_blank");
  await page.goto(`/map?${Q}`);
  await expect(page).toHaveURL(/\/harita\?d=60&at=2026-10-27T13(:|%3A)00$/);

  // İçeriğe atla: klavyede ilk odak
  await page.goto(`/?${Q}`);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "İçeriğe atla" })).toBeFocused();
});

test("ana sayfa: boş sınıflar sade kartla; dolu/bilinmeyen ayrı; kütüphane ve kafeler", async ({ page }) => {
  await page.goto(`/?${Q}`);
  await expect(page.getByRole("heading", { level: 2, name: /arası boş sınıflar/ })).toBeVisible();
  await page.getByRole("button", { name: /Tümünü göster/ }).click();
  const card = freeList(page).getByRole("listitem").filter({ hasText: "BB-102" });
  await expect(card.getByText("Programda boş")).toBeVisible();
  await expect(card.getByText("17.00'ye kadar")).toBeVisible();
  await expect(card.getByText("Bilgisayar ve Bilişim Bilimleri Fakültesi")).toBeVisible();
  // Dersi olan sınıf hiç listelenmez; programı bilinmeyen "Dolu ya da durumu bilinmeyen" bölümünde
  await expect(page.getByRole("listitem").filter({ hasText: "BB-101" })).toHaveCount(0);
  await expect(freeList(page).getByRole("listitem").filter({ hasText: "HF-201" })).toHaveCount(0);
  await page.getByText(/Dolu ya da durumu bilinmeyen/).click();
  await expect(page.getByRole("listitem").filter({ hasText: "HF-201" }).getByText("Durum bilinmiyor")).toBeVisible();
  const library = page.getByRole("link", { name: /Süleyman Demirel Kütüphanesi/ });
  await expect(library.getByText("7/24 açık")).toBeVisible();
  await expect(page.getByRole("link", { name: /Taş Kafe/ })).toBeVisible();
});

test("check-in diğer cihazda 5 sn içinde görünür, aynı odaya ikinci bildirim hız sınırına takılır (T18)", async ({ browser }) => {
  const a = await newPhone(browser);
  const b = await newPhone(browser);
  await b.goto(`/?${Q}&q=bb204`);
  await expect(freeList(b).getByRole("listitem").filter({ hasText: "BB-204" }).getByText("Programda boş")).toBeVisible();

  await a.goto(room("bilisim-fakultesi", "BB-204"));
  await a.getByRole("button", { name: "Buradayım, uygun (check-in)" }).click();
  await expect(reportMessage(a)).toHaveText("Check-in yapıldı. Teşekkürler, birlikte daha iyi biliyoruz.");

  await expect(freeList(b).getByRole("listitem").filter({ hasText: "BB-204" }).getByText("Öğrenci doğruladı")).toBeVisible({
    timeout: 5_000,
  });

  await a.getByRole("button", { name: "Dolu" }).click();
  await expect(reportMessage(a)).toHaveText("Bu alan için 10 dakikada bir bildirim yapabilirsin");
});

test("değerlendirme check-in ister, check-in başına bir kez; 3 değerlendirmeden sonra haritada ortalama", async ({ browser }) => {
  const scores = [3, 4, 5];
  for (const [i, s] of scores.entries()) {
    const p = await newPhone(browser);
    await p.goto(room("fen-edebiyat-fakultesi", "FE-103"));
    if (i === 0) {
      await rate(p, s);
      await expect(formMessage(p)).toHaveText("Değerlendirme için önce bu alanda check-in yapmalısın"); // T19
    }
    await p.getByRole("button", { name: "Buradayım, uygun (check-in)" }).click();
    await expect(reportMessage(p)).toHaveText("Check-in yapıldı. Teşekkürler, birlikte daha iyi biliyoruz.");
    await rate(p, s);
    await expect(formMessage(p)).toHaveText("Değerlendirmen kaydedildi, teşekkürler!");
    if (i === 0) {
      await rate(p, 1);
      await expect(formMessage(p)).toHaveText("Bu check-in için zaten değerlendirme yaptın"); // T21
      await expect(p.getByText("Henüz yeterli değerlendirme yok (1/3).")).toBeVisible(); // T22
    }
  }

  const map = await newPhone(browser);
  await map.goto(`/harita?${Q}&b=fen-edebiyat-fakultesi`);
  await expect(map.getByRole("dialog").getByRole("link", { name: /Google Haritalar'da yol tarifi/ })).toBeVisible();
  await expect(map.locator('a[aria-label^="FE-103 "]')).toHaveAttribute("aria-label", /Ortalama puan 4\.0$/);
});

test("harita: işarete dokununca yer paneli açılır, hızlı check-in panelde ve ana sayfada görünür", async ({ browser }) => {
  const a = await newPhone(browser);
  await a.goto(`/harita?${Q}`);
  await expect(a.getByRole("heading", { level: 2, name: /boş sınıf/ })).toBeVisible();
  await a.locator('a[aria-label^="Taş Kafe"]').click();
  await expect(a).toHaveURL(/s=tas-kafe/);
  const panel = a.getByRole("dialog", { name: "Taş Kafe" });
  await expect(panel.getByRole("heading", { name: "Taş Kafe" })).toBeFocused();
  await panel.getByRole("button", { name: "Buradayım, uygun (check-in)" }).click();
  await expect(panel.getByText("Check-in yapıldı. Teşekkürler, birlikte daha iyi biliyoruz.")).toBeVisible();
  await expect(panel.getByText("Öğrenci doğruladı")).toBeVisible({ timeout: 5_000 });

  const b = await newPhone(browser);
  await b.goto(`/?${Q}`);
  await expect(b.getByRole("link", { name: /Taş Kafe/ }).getByText("Öğrenci doğruladı")).toBeVisible({ timeout: 5_000 });

  // Esc paneli kapatır, özet geri gelir
  await panel.getByRole("button", { name: "Kapat" }).focus();
  await a.keyboard.press("Escape");
  await expect(a.getByRole("dialog")).toHaveCount(0);
  await expect(a).not.toHaveURL(/s=tas-kafe/);
});

test("harita araması Türkçe karakter katlar; filtre puansızı dışarıda bırakır ve sekmeler arasında taşınır", async ({ page }) => {
  await page.goto(`/harita?${Q}`);
  await page.getByRole("searchbox", { name: "Sınıf, bina veya yer ara" }).fill("bb102");
  await page.getByRole("list", { name: "Arama sonuçları" }).getByRole("link", { name: /BB-102/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "BB-102" })).toBeVisible();

  await page.goto(`/harita?${Q}`);
  await page.getByRole("searchbox", { name: "Sınıf, bina veya yer ara" }).fill("kutuphane");
  await page.getByRole("button", { name: /^Kütüphane Ek Bina/ }).click();
  await expect(page.getByRole("dialog", { name: "Kütüphane Ek Bina" })).toBeVisible();

  await page.goto(`/?${Q}&q=bb102`);
  await expect(freeList(page).getByRole("listitem").filter({ hasText: "BB-102" })).toHaveCount(1);
  await page.getByRole("button", { name: "Sessiz" }).click();
  await expect(page).toHaveURL(/f=quiet/);
  await expect(page.getByRole("button", { name: "Sessiz" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("listitem").filter({ hasText: "BB-102" })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Ana gezinme" }).getByRole("link", { name: "Harita" }).click();
  await expect(page).toHaveURL(/f=quiet/);
});

test("puan: check-in +5, profilde görünür; SAÜ dışı Google reddedilir, öğrenci hesabına bağlanınca puan korunur", async ({
  browser,
}) => {
  test.skip(process.env.E2E_BACKEND === "memory", "Firebase'siz prototipte Google girişi yok");
  const p = await newPhone(browser);
  await p.goto(`/harita?${Q}&s=kantin`);
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
  await p.goto(`/harita?${Q}&s=kampus-kafeterya`);
  const panel = p.getByRole("dialog", { name: "Kampüs Kafeterya" });
  await panel.getByRole("button", { name: "Buradayım, uygun (check-in)" }).click();
  await expect(panel.getByText("+5 puan kazandın")).toBeVisible();

  await p.goto(`/profil?${Q}`);
  await expect(p.getByTestId("points")).toHaveText("5");
  await p.getByText("Ayarlar", { exact: true }).click();
  await p.getByRole("button", { name: "Hesabımı sil" }).click();
  await p.getByRole("button", { name: "Evet, kalıcı olarak sil" }).click();
  await expect(p.getByText(/Hesabın ve kişisel verilerin silindi/)).toBeVisible();
  await expect(p.getByTestId("points")).toHaveText("0");
  await expect(p.getByText(/Henüz katkın yok/)).toBeVisible();

  await p.goto(`/harita?${Q}&s=kampus-kafeterya`);
  await expect(p.getByRole("dialog", { name: "Kampüs Kafeterya" }).getByText("Öğrenci doğruladı")).toBeVisible();
});

test("görünüm: sistem koyu olsa da açık tema; Profil → Ayarlar'dan koyu seçilir ve kalır", async ({ browser }) => {
  const p = await (await browser.newContext({ colorScheme: "dark" })).newPage();
  await p.goto(`/?${Q}`);
  await expect(p.locator("html")).not.toHaveAttribute("data-theme", "dark");
  await expect(p.locator("body")).toHaveCSS("background-color", "rgb(246, 247, 251)");
  await p.goto(`/profil?${Q}`);
  await p.getByText("Ayarlar", { exact: true }).click();
  await p.getByRole("group", { name: "Görünüm" }).getByText("Koyu", { exact: true }).click();
  await expect(p.locator("html")).toHaveAttribute("data-theme", "dark");
  await p.reload();
  await expect(p.locator("html")).toHaveAttribute("data-theme", "dark");
  await p.getByText("Ayarlar", { exact: true }).click();
  await expect(p.getByRole("radio", { name: /Koyu/ })).toBeChecked();
  await p.getByRole("group", { name: "Görünüm" }).getByText("Açık", { exact: true }).click();
  await expect(p.locator("html")).not.toHaveAttribute("data-theme", "dark");
});

test("ana sayfa araması Türkçe karakter katlar, URL'de kalır, boş sonuçta ne yapılacağını söyler", async ({ page }) => {
  await page.goto(`/?${Q}`);
  const box = page.getByRole("searchbox", { name: "Sınıf, bina veya yer ara" });
  await box.fill("itb102");
  await expect(page).toHaveURL(/q=itb102/);
  await expect(freeList(page).getByRole("listitem").filter({ hasText: "İTB-102" })).toHaveCount(1);
  await expect(page.getByRole("listitem").filter({ hasText: "BB-102" })).toHaveCount(0);
  await box.fill("kutuphane");
  await expect(page.getByRole("link", { name: /Kütüphane Ek Bina/ })).toBeVisible();
  await expect(page.getByText(/aramasına uyan boş sınıf yok/)).toBeVisible();
  await expect(page).toHaveURL(/q=kutuphane/); // URL güncellenmeden yenilenirse eski arama gelir
  await page.reload();
  await expect(page.getByRole("searchbox", { name: "Sınıf, bina veya yer ara" })).toHaveValue("kutuphane");
});
