# neredeçalışalım — "Şu an nerede çalışabilirim?"

[![CI](https://github.com/batuudemiir/sau-calisma-asistani/actions/workflows/ci.yml/badge.svg)](https://github.com/batuudemiir/sau-calisma-asistani/actions/workflows/ci.yml)

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
- **Marka:** neredeçalışalım tasarım sistemi (kobalt + limon, Zilla Slab / Public Sans / IBM Plex Mono), token'lar `src/app/globals.css`
- **Gerçek kampüs haritası:** OpenStreetMap'ten 181 binanın gerçek konum ve sınırları (SVG, harita paketi yok); kat görünümünde her odada durum ve puan
- **Çalışma yerleri:** Merkez Kütüphane, Kütüphane Ek Bina ve kampüsteki 4 kafe/kantin — açılış saati (kaynaklıysa), bildirim ve puanla
- **Kütüphane kartı:** bildirim tabanlı; demo modunda "Örnek demo verisi" etiketli gün içi doluluk deseni
- **Çalışma asistanı:** haritanın sağ altındaki yuvarlak düğme. Kural tabanlı öneri motoru (`src/domain/assistant.ts`), yapay zekâ API'si yok: süre, ihtiyaç (sessiz/priz/internet/ışık), yer türü ve isteğe bağlı konumla (yalnızca cihazda) en iyi 3 yeri gerekçeleri ve bilinmeyenleriyle önerir
- **QR ile check-in:** her derslik için sunucu anahtarıyla imzalı QR (`npm run qr`); okutunca doğrulanmış check-in (+10 puan) ve geri bildirim. Aynı QR kısa sürede çok hesaptan kullanılırsa bonus verilmez
- **Aylık ödüller:** ay içinde puan eşiğine ulaşan SAÜ öğrencisi stok bitene kadar ödül alır (çekiliş değil). Sponsor olmadığından ödüller "Örnek demo verisi"; kuponlar `ORNEK-` ile başlar ve geçersizdir
- **Veri hazırlama hattı:** XLSX → deterministik ayrıştırma, PDF → Gemini (yapılandırılmış JSON), elle derlenmiş CSV (Plan B), Zod + kalite kuralları, insan kontrolü, yayın/geri dönüş

## Durum (dürüst özet)

| Konu | Durum |
|---|---|
| Uygunluk/güven/sıralama/değerlendirme/puan/asistan/ödül kuralları | 157 birim testi geçiyor (T1-T27 dahil) |
| Kampüs konumları | OSM'den 181 bina; 43 adlı. İşletme, Siyasal, İletişim, Sağlık Bilimleri fakültelerinin binası OSM'de adlı değil |
| SABİS ders programı | **Erişilemedi** (ağ politikası); içe aktarıcı erişim açılınca yazılacak |
| Uçtan uca akış | `npm run test:e2e`: 29 Playwright testi (harita, liste, arama/filtre, check-in, puan, Google girişi, hesap silme, asistan, QR, ödül + axe) emulator + örnek veriyle geçiyor |
| Erişilebilirlik | axe (WCAG 2.2 A/AA kuralları) açık ve koyu temada 8 sayfa + asistan panelinde ihlal bulmadı; ekran okuyucuyla elle test yapılmadı |
| Google girişi | **Şimdilik kapalı** (`NEXT_PUBLIC_GOOGLE_LOGIN=true` ile açılır); kod ve emulator testleri hazır |
| QR, ödüller | Emulator'da test edildi; **canlı Firebase projesinde doğrulanmadı**. Ödül sponsoru yok |
| Gerçek SAÜ ders programı | **Yok.** Geliştirme ortamından sakarya.edu.tr erişilemedi; belge eklenip `ingest` ile işlenmeli |
| Gemini ile PDF ayrıştırma | Kod ve yanıt doğrulama testli; **gerçek API çağrısı doğrulanmadı** (anahtar yok). Model `GEMINI_MODEL` ile seçilir |
| Firebase App Hosting dağıtımı | `apphosting.yaml` hazır; **canlı ortamda doğrulanmadı** |

## Teknolojiler

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Cloud Firestore · Firebase Anonymous Auth ·
Firebase Admin SDK · Zod · Gemini API (`@google/genai`, yalnızca betiklerde) · ExcelJS · Vitest · Playwright

## Sürekli entegrasyon

Her push ve PR'da GitHub Actions (`.github/workflows/ci.yml`): birim testleri, lint, tip kontrolü, build;
ardından Firebase Emulator + Playwright ile uçtan uca testler. Gizli anahtar gerekmez.

## Yerel çalıştırma (Emulator + örnek veri)

macOS: projeyi iCloud ile eşitlenen Masaüstü/Belgeler yerine örneğin `~/Projeler/` altına klonla (aksi hâlde
`next dev` "Operation timed out (os error 60)" ile çökebilir).

Gereksinimler: Node 22+, Java 21 (Firestore emulator için; macOS'ta Homebrew yoksa https://adoptium.net → Temurin 21 `.pkg`).

```bash
npm install
```

Yerel demo için `.env.local` **gerekmez**: emulator değerleri repodaki `.env.development` dosyasında (sahte, gizli değil).
`.env.example`'dan boş bir `.env.local` kopyaladıysan sil (`rm .env.local`); boş değerler varsayılanların önüne geçer.
Gerçek bir Firebase projesine bağlanırken `.env.local` oluşturulur ve oradaki değerler önceliklidir.

```bash
npm run demo:local      # emulator'ları açar, örnek veriyi yükler, next dev başlatır
```

Sonra http://localhost:3000 adresini aç (dev modunda ilk API isteği derleme yüzünden 10-20 sn sürebilir). Gece geliştirme yaparken bina kapalı görünür; demo modunda program saati
`?at=` ile verilebilir: http://localhost:3000/liste?d=60&at=2026-10-27T13:00
(demo saati yalnızca ders programını kaydırır; bildirimler gerçek saatle değerlendirilir).

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm test` | Vitest (domain, sunucu servisleri, veri hattı) |
| `npm run test:e2e` | Playwright: production build + emulator + örnek veriyle 3 uçtan uca senaryo (Java gerekir) |
| `npm run typecheck` / `npm run lint` | Tip kontrolü / ESLint |
| `npm run demo:local` | Emulator + örnek veri + dev sunucusu (yalnızca bu bilgisayardan) |
| `npm run demo:lan` | Telefonlarla demo: emulator'lar yerel ağa açık, üretim derlemesi `0.0.0.0:3000` |
| `npm run seed-campus` | Kampüs kataloğu: çalışma yerleri + bina konumları (gerçek veri, OSM) |
| `npm run seed-demo [-- --clear \| --only-library]` | Örnek veri yazar / yalnızca `isSimulated` kayıtları siler / yalnızca kütüphane örneği (`DEMO_MODE=true` gerekir) |
| `npm run demo-report -- <oda> <uygun\|dolu\|kullanilamiyor\|guncel_degil> [--ago dk]` | Demo için etiketli yapay bildirim (`DEMO_MODE=true` gerekir) |
| `npm run qr -- --base <adres> [--building <id>] [--emulator]` | Derslik kapıları için basılabilir QR sayfası (`data/qr/`, depoya girmez; `QR_SECRET` gerekir) |
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
   Sunucu program verisini 60 sn önbellekte tuttuğu için yeni yayın en geç 1 dakika içinde görünür.

### İlk demo: ekibin kendi ders programıyla

Kişisel programlar yalnızca **bizim** derslerimizi bilir; o odalarda başka derslerin olup olmadığını bilmez.
Bu yüzden kaynak `--coverage PARTIAL` ile yüklenir: bilinen dersle çakışan oda elenir, diğer saatlerde oda
"Program kısmi: yalnızca bilinen dersler" görünür ve asla kendiliğinden "boş" denmez. Yerinde yapılan bildirim etiketi değiştirir.

```bash
# 1) data/sources/elle-giris-sablonu.csv → data/sources/ekip-programi.csv olarak kopyala, derslerinizi yazın
npm run ingest -- data/sources/ekip-programi.csv --coverage PARTIAL --building isletme-a
#    (dönem "2026-2027 Güz", bölüm "Ekip" varsayılır; odalar CSV'den çıkarılır)
# 2) çıktıdaki listeyi kendi programınızla karşılaştırın, sonra yayımlayın
npm run publish-schedule -- data/drafts/ekip-2026-guz-v1.json --reviewed-by ekip \
  --building-name "İşletme Fakültesi" --term-label "2026-2027 Güz" --starts-on <dönem başı> --ends-on <dönem sonu>
# 3) yalnızca kütüphane örnek verisi (örnek bina yüklenmez)
DEMO_MODE=true npm run seed-demo -- --only-library
# 4) demo sırasında etiketli yapay bildirimler (30 dk etkili; "Örnek demo verisi" olarak görünür)
DEMO_MODE=true npm run demo-report -- A204 dolu
DEMO_MODE=true npm run demo-report -- A205 uygun --ago 3
```

Emulator ile yerelde: önce `npm run emulators` (ayrı terminal), sonra yukarıdaki komutları
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-sau-calisma` ile çalıştırın ve `npm run dev`.

### Plan B: belge bulunamazsa elle derlenmiş program

`data/sources/elle-giris-sablonu.csv` dosyasını kopyalayıp yalnızca **görülen** bilgilerle doldurun (kendi ders
programınız, kapıdaki çizelge). Ayrıştırma `.xlsx` ile aynı komutla yapılır: `npm run ingest -- data/sources/elle.csv ...`
Bu kaynaklar `parseMethod=MANUAL` olarak yayımlanır ve kartta "ekip tarafından elle derlenmiş" yazar.

## Dağıtım (Plan A: Firebase App Hosting)

1. Firebase projesi oluştur, Blaze planını aç; Firestore (europe bölgesi) ve Anonymous Auth'u etkinleştir.
2. Kuralları ve indeksleri yükle: `npx firebase deploy --only firestore:rules,firestore:indexes --project <id>`
3. Web App ekle, değerlerini `apphosting.yaml` içine yaz.
4. App Hosting'de GitHub reposunu bağla; her push'ta derlenir. Admin SDK varsayılan kimliği kullanır.
5. Demo için: `DEMO_MODE=true` ile `seed-demo`'yu üretim projesine karşı çalıştır (servis hesabıyla) ya da gerçek programı yayımla.

Plan B: Vercel — aynı `NEXT_PUBLIC_*` değişkenleri + `FIREBASE_SERVICE_ACCOUNT` (tek satır JSON) + `DEMO_MODE`.

## Kampüs verisi

Konum verisi © OpenStreetMap katkıda bulunanlar (ODbL). Kaynaklar, doğrulananlar ve eksikler: `docs/CAMPUS_RESEARCH.md`.
Yeniden üretmek için: `python3 -I scripts/campus/gpkg_to_json.py <sau_kampus.gpkg> data/campus/esentepe-osm.json`.

## Güvenlik ve gizlilik

- Giriş isteğe bağlı. Girişsiz kullanımda yalnızca anonim oturum kimliği (uid) tutulur; uid başka kullanıcılara gönderilmez.
- SAÜ öğrenci girişi (Google, `@ogr.sakarya.edu.tr`) sunucuda doğrulanır; e-posta Firestore'a yazılmaz.
  Kişisel puanlar yalnızca sahibine görünür; Profil'den hesap ve kişisel veriler silinebilir.
- Erişilebilirlik: axe-core taraması CI'da (WCAG 2.2 A/AA kuralları; açık/koyu tema).
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
