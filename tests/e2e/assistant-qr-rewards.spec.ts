import { expect, test, type Browser } from "@playwright/test";
import { qrToken } from "../../src/server/qr";

// playwright.config.ts → webServer.env.QR_SECRET ile aynı olmalı
const SECRET = "e2e-qr-anahtari";
const Q = "d=60&at=2026-10-27T13:00";
// Örnek veride (scripts/seed-demo) gerçek fakülte binalarındaki sınıflar
const qrPath = (building: string, code: string) => {
  const id = `${building}-${code}`;
  return `/qr/${encodeURIComponent(id)}/${qrToken(id, SECRET)}`;
};

async function phone(browser: Browser, opts: Parameters<Browser["newContext"]>[0] = {}) {
  return (await browser.newContext(opts)).newPage();
}

test("asistan: sorularla öneri verir, gerekçe ve bilinmeyenleri yazar", async ({ browser }) => {
  const p = await phone(browser);
  await p.goto(`/?${Q}`);
  await p.getByRole("button", { name: "Asistan" }).click();
  const panel = p.getByRole("dialog", { name: "Çalışma asistanı" });
  await expect(panel.getByRole("heading", { name: "Çalışma asistanı" })).toBeFocused();

  await panel.getByRole("button", { name: "Etiketler ne anlama geliyor?" }).click();
  await expect(panel.getByText(/gerçekten boş olduğu doğrulanmadı/)).toBeVisible();

  await panel.getByRole("button", { name: "Çalışacak yer bul" }).click();
  await panel.getByRole("button", { name: "90 dakika" }).click();
  await expect(p).toHaveURL(/d=90/);
  await panel.getByRole("button", { name: "Priz" }).click();
  await expect(panel.getByRole("button", { name: "Priz" })).toHaveAttribute("aria-pressed", "true");
  await panel.getByRole("button", { name: "Devam" }).click();
  await panel.getByRole("button", { name: "Fark etmez" }).click();
  await panel.getByRole("button", { name: "Hayır, konumsuz öner" }).click();

  const recs = panel
    .getByRole("region", { name: "Öneriler" })
    .getByRole("listitem")
    .filter({ has: p.locator("p.font-bold") });
  await expect(recs).toHaveCount(3);
  await expect(panel.getByText(/Priz (iyi|orta|zayıf): \d\.\d\/5|Priz bilgisi yok/).first()).toBeVisible();

  await p.keyboard.press("Escape");
  await expect(p.getByRole("dialog", { name: "Çalışma asistanı" })).toHaveCount(0);
  await expect(p.getByRole("button", { name: "Asistan" })).toBeFocused();
});

test("asistan: konum izni verilirse yakındakileri mesafeyle önerir (konum cihazda kalır)", async ({ browser }) => {
  const p = await phone(browser, { geolocation: { latitude: 40.7425, longitude: 30.3325 }, permissions: ["geolocation"] });
  await p.goto(`/?${Q}`);
  await p.getByRole("button", { name: "Asistan" }).click();
  const panel = p.getByRole("dialog", { name: "Çalışma asistanı" });
  await panel.getByRole("button", { name: "Çalışacak yer bul" }).click();
  await panel.getByRole("button", { name: "60 dakika" }).click();
  await panel.getByRole("button", { name: "Fark etmez, devam" }).click();
  await panel.getByRole("button", { name: "Kütüphane" }).click();
  await panel.getByRole("button", { name: "Konumumu kullan" }).click();
  await expect(panel.getByText(/Konumunu aldım/)).toBeVisible();
  await expect(panel.getByText(/dk yürüme/).first()).toBeVisible();
  await expect(panel.getByText(/Süleyman Demirel/).first()).toBeVisible();
});

test("QR: geçerli kod +10 puan ve ardından geri bildirim; geçersiz kod reddedilir", async ({ browser }) => {
  const p = await phone(browser);
  await p.goto(qrPath("muhendislik-m2", "M2-203"));
  await expect(p.getByRole("heading", { level: 1, name: "M2-203" })).toBeVisible();
  await p.getByRole("button", { name: "Buradayım, uygun (QR ile check-in)" }).click();
  await expect(p.getByRole("heading", { name: "QR ile check-in yapıldı, teşekkürler!" })).toBeVisible();
  await expect(p.getByText("+10 puan kazandın")).toBeVisible();
  for (const c of ["Sessizlik", "Priz", "İnternet", "Işık"])
    await p.getByRole("group", { name: c }).getByText("4", { exact: true }).click();
  await p.getByRole("button", { name: "Değerlendirmeyi gönder" }).click();
  await expect(p.getByText("Geri bildirimin kaydedildi. Teşekkürler!")).toBeVisible();

  const bad = await phone(browser);
  await bad.goto(qrPath("muhendislik-m2", "M2-203").replace(/\/[^/]+$/, "/sahte-kod-1234567890ab"));
  await bad.getByRole("button", { name: "Buradayım, uygun (QR ile check-in)" }).click();
  await expect(bad.getByText("QR kod bu alana ait değil veya geçersiz")).toBeVisible();
});

test("ödül: eşiğe ulaşınca öğrenci hesabı ister; giriş sonrası örnek kupon alınır, ikinci kez alınamaz", async ({ browser }) => {
  test.skip(process.env.E2E_BACKEND === "memory", "Firebase'siz prototipte Google/öğrenci girişi yok");
  const p = await phone(browser);
  await p.goto(qrPath("muhendislik-m6", "M6-101"));
  await p.getByRole("button", { name: "Buradayım, uygun (QR ile check-in)" }).click();
  await expect(p.getByText(/\+1\d puan kazandın/)).toBeVisible();

  await p.goto(`/profil?${Q}`);
  const tea = p.getByRole("listitem").filter({ has: p.getByRole("heading", { name: "Kampüs kafesinde çay" }) });
  await expect(tea.getByText("Örnek demo verisi")).toBeVisible();
  await expect(tea.getByText("Ödül almak için SAÜ öğrenci hesabınla giriş yapmalısın")).toBeVisible();
  const coffee = p.getByRole("listitem").filter({ has: p.getByRole("heading", { name: "Kampüs kafesinde kahve" }) });
  await expect(coffee.getByText("Bu ay yeterli puanın yok")).toBeVisible();

  await p.evaluate(() => (window.__fakeGoogleEmail = "b221210002@ogr.sakarya.edu.tr"));
  await p.getByRole("button", { name: "SAÜ hesabıyla giriş yap (Google)" }).click();
  await expect(p.getByRole("heading", { name: "SAÜ öğrenci hesabı" })).toBeVisible();
  await tea.getByRole("button", { name: "Kampüs kafesinde çay — ödülü al" }).click();
  await expect(tea.getByText(/Kuponun: ORNEK-[0-9A-F]{4}-[0-9A-F]{4}/)).toBeVisible();
  await expect(tea.getByText("Örnek demo kuponu — hiçbir yerde geçerli değildir.")).toBeVisible();
  await expect(tea.getByRole("button")).toHaveCount(0);
});

test("sunum prototipi (Firebase'siz): etiketsiz örnek veri; QR → SAÜ öğrenci hesabı → kupon", async ({ browser }) => {
  test.skip(process.env.E2E_BACKEND !== "memory", "Yalnızca bellek arka ucunda");
  const p = await phone(browser);
  // Gerçek fakülte binası haritada, sayısı boş sınıf
  await p.goto(`/harita?${Q}`);
  await expect(p.getByRole("link", { name: /^Bilgisayar ve Bilişim Bilimleri Fakültesi: \d+ boş sınıf/ })).toBeVisible();
  await expect(p.getByText("Salı 27 Ekim · 13.00–14.00")).toBeVisible();

  // Her an son 30 dakikada olan bildirimler (Çarşamba 13.00: sunum saati)
  await p.goto("/?d=60&at=2026-10-28T13:00");
  await expect(p.getByText("Öğrenci doğruladı").first()).toBeVisible();
  await p.getByText(/Dolu ya da durumu bilinmeyen/).click();
  await expect(p.getByText("Dolu bildirildi").first()).toBeVisible();

  // Hiçbir sayfada "örnek / demo / temsili" yazmaz (ekip kararı; CLAUDE.md kural 6 istisnası)
  for (const path of [`/?${Q}`, `/harita?${Q}&b=bilisim-fakultesi`, `/yer/kutuphane-merkez?${Q}`, "/profil", "/hakkinda"]) {
    await p.goto(path);
    await expect(p.getByRole("heading", { level: 1 }).first()).toBeAttached();
    await p.waitForTimeout(500);
    const text = await p.evaluate(
      () =>
        document.body.innerText +
        " " +
        [...document.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label")).join(" "),
    );
    expect(text, path).not.toMatch(/örnek|demo|temsili|simül/i);
  }

  await p.goto(qrPath("muhendislik-m4", "M4-202"));
  await p.getByRole("button", { name: "Buradayım, uygun (QR ile check-in)" }).click();
  await expect(p.getByText(/\+1\d puan kazandın/)).toBeVisible();
  await p.goto("/profil");
  await p.getByRole("button", { name: "SAÜ öğrenci hesabıyla devam et" }).click();
  await expect(p.getByText("SAÜ öğrenci hesabıyla giriş yapıldı.")).toBeVisible();
  await p.getByRole("button", { name: /Kampüs kafesinde çay — ödülü al/ }).click();
  await expect(p.getByText(/KAMPUS-[0-9A-F]{4}-[0-9A-F]{4}/)).toBeVisible();
});
