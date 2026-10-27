# SAÜ Çalışma Asistanı — "Şu an nerede çalışabilirim?"

Kütüphanede yer bulamayan SAÜ öğrencisine, seçtiği süre (30/60/90/120 dk) boyunca çalışabileceği alanları
**bilginin kaynağı ve güven düzeyiyle** gösteren mobil uyumlu web uygulaması.
GDG on Campus SAÜ Hackathon, 27-28 Ekim 2026.

Temel ilke: *programda boş görünen derslik, gerçekten boş olduğu doğrulanmış derslik değildir.* Her sonuç
"Programda boş", "Öğrenci doğruladı", "Durum bilinmiyor" veya "Dolu bildirildi" etiketiyle ve metinle gösterilir;
bilinmeyen bilgi asla "boş" kabul edilmez.

## Özellikler

- **Süreye göre arama:** ders programı + 10 dk geçiş payı + bina saatleriyle uygunluk (saf TypeScript motoru, `src/domain`)
- **Güven etiketleri:** son 30 dk öğrenci bildirimleri, çelişki ve "bilgi güncel değil" durumları
- **Check-in ve bildirim:** anonim oturum, tek dokunuş, hız sınırı (aynı oda 10 dk'da 1, saatte 20)
- **Değerlendirme:** check-in sonrası 3 saat içinde Sessizlik / Priz / İnternet / Işık için 1-5 puan; 3 değerlendirmeden önce ortalama gösterilmez
- **SVG kampüs/bina haritası:** her odada durum metni ve ortalama puan (harita paketi yok, şematik çizim)
- **Kütüphane kartı:** bildirim tabanlı; demo modunda "Örnek demo verisi" etiketli gün içi doluluk deseni
- **Veri hazırlama hattı:** XLSX → deterministik ayrıştırma, PDF → Gemini (yapılandırılmış JSON), Zod + kalite kuralları, insan kontrolü, yayın/geri dönüş

## Durum (dürüst özet)

| Konu | Durum |
|---|---|
| Uygunluk/güven/sıralama/değerlendirme kuralları | 91 birim testi geçiyor (T1-T23 dahil) |
| Uçtan uca akış (arama, ayrıntı, check-in, puan, harita) | `npm run test:e2e` ile 3 Playwright senaryosu geçiyor (emulator + örnek veri); check-in diğer cihazda ≤5 sn |
| Erişilebilirlik | axe (WCAG 2.0/2.1/2.2 AA) açık ve koyu temada 5 sayfada ihlal bulmadı; SVG metin kontrastı elle kontrol edildi |
| Gerçek SAÜ ders programı | **Yok.** Geliştirme ortamından sakarya.edu.tr erişilemedi; belge eklenip `ingest` ile işlenmeli |
| Gemini ile PDF ayrıştırma | Kod ve yanıt doğrulama testli; **gerçek API çağrısı doğrulanmadı** (anahtar yok). Model `GEMINI_MODEL` ile seçilir |
| Firebase App Hosting dağıtımı | `apphosting.yaml` hazır; **canlı ortamda doğrulanmadı** |

## Teknolojiler

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Cloud Firestore · Firebase Anonymous Auth ·
Firebase Admin SDK · Zod · Gemini API (`@google/genai`, yalnızca betiklerde) · ExcelJS · Vitest · Playwright

## Yerel çalıştırma (Emulator + örnek veri)

Gereksinimler: Node 22+, Java 21 (Firestore emulator için).

```bash
npm install
cp .env.example .env.local
```

`.env.local` içinde yerel değerler:

```
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-sau-calisma.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-sau-calisma
NEXT_PUBLIC_FIREBASE_APP_ID=demo-app
NEXT_PUBLIC_USE_EMULATOR=true
DEMO_MODE=true
```

```bash
npm run demo:local      # emulator'ları açar, örnek veriyi yükler, next dev başlatır
```

Sonra http://localhost:3000 adresini aç (dev modunda ilk API isteği derleme yüzünden 10-20 sn sürebilir). Gece geliştirme yaparken bina kapalı görünür; demo modunda program saati
`?at=` ile verilebilir: http://localhost:3000/results?d=60&at=2026-10-27T13:00
(demo saati yalnızca ders programını kaydırır; bildirimler gerçek saatle değerlendirilir).

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm test` | Vitest (domain, sunucu servisleri, veri hattı) |
| `npm run test:e2e` | Playwright: production build + emulator + örnek veriyle 3 uçtan uca senaryo (Java gerekir) |
| `npm run typecheck` / `npm run lint` | Tip kontrolü / ESLint |
| `npm run demo:local` | Emulator + örnek veri + dev sunucusu |
| `npm run seed-demo [-- --clear]` | Örnek veri yazar / yalnızca `isSimulated` kayıtları siler (`DEMO_MODE=true` gerekir) |
| `npm run ingest -- <dosya> ...` | Kaynak belgeyi taslak JSON'a çevirir (`data/drafts/`) |
| `npm run publish-schedule -- <taslak> ...` | İncelenmiş taslağı Firestore'a yayımlar; `--rollback <sourceId>` |

## Gerçek ders programını ekleme

1. Belgeyi `data/sources/` içine koy; oda listesini JSON olarak yaz (ör. `data/sources/rooms-isletme-a.json`: `["A101","A102",...]`).
2. Ayrıştır:
   ```bash
   npm run ingest -- data/sources/program.xlsx --term 2026-guz --term-label "2026-2027 Güz" \
     --document-term "2026-2027 Güz" --department İşletme --building isletme-a \
     --rooms data/sources/rooms-isletme-a.json --url <belgenin resmî adresi>
   ```
   PDF için `.env.local` içinde `GEMINI_API_KEY` gerekir. Çıktı: işaretli kayıtlar + rastgele 10 kayıt listesi.
3. Listeyi kaynak belgeyle **elle** karşılaştır.
4. Yayımla: `npm run publish-schedule -- data/drafts/<id>.json --reviewed-by <ad> --building-name "İşletme Fakültesi A Blok"`
   (`needsReview` kayıtlar yayımlanmaz; bu kayıtların odası "Program verisi eksik" görünür.)

## Dağıtım (Plan A: Firebase App Hosting)

1. Firebase projesi oluştur, Blaze planını aç; Firestore (europe bölgesi) ve Anonymous Auth'u etkinleştir.
2. Kuralları ve indeksleri yükle: `npx firebase deploy --only firestore:rules,firestore:indexes --project <id>`
3. Web App ekle, değerlerini `apphosting.yaml` içine yaz.
4. App Hosting'de GitHub reposunu bağla; her push'ta derlenir. Admin SDK varsayılan kimliği kullanır.
5. Demo için: `DEMO_MODE=true` ile `seed-demo`'yu üretim projesine karşı çalıştır (servis hesabıyla) ya da gerçek programı yayımla.

Plan B: Vercel — aynı `NEXT_PUBLIC_*` değişkenleri + `FIREBASE_SERVICE_ACCOUNT` (tek satır JSON) + `DEMO_MODE`.

## Güvenlik ve gizlilik

- Kişisel veri toplanmaz: bildirim ve puanlarda yalnızca anonim oturum kimliği (uid) tutulur; uid istemciye hiç gönderilmez.
- İstemciden Firestore'a yazma yok (`firestore.rules`); tüm yazmalar Route Handler + Admin SDK + Zod ile.
- `GEMINI_API_KEY` yalnızca betiklerde; web uygulaması Gemini'yi çağırmaz.
- KVKK uyumluluğu hakkında garanti verilmez.

## Proje yapısı

```
src/domain/     saf TS: uygunluk, güven, sıralama, değerlendirme (Firebase/React importu yasak, testle korunur)
src/server/     Admin SDK, veri erişimi, arama/bildirim/puan servisleri, hız sınırı
src/app/        sayfalar ve API uçları (iş kuralı yok)
src/components/ sunum bileşenleri, map/ altında SVG harita
scripts/        ingest, publish, seed-demo
docs/           ürün, mimari, kurallar, plan, demo belgeleri
tests/          domain, server, ingest
```

## Ekip

<!-- Ekip üyelerini ekleyin -->
