# DEMO_RUNBOOK.md

Amaç: Canlı demonun (3-5 dk) adım adım provası. `DEMO_AND_PITCH.md` neyin anlatılacağını, bu belge nasıl yapılacağını söyler.

## Demo öncesi (T-30 dk)

- [ ] Canlı link açılıyor; `DEMO_MODE=true` (demo saati ve etiketli simülasyon için).
- [ ] Gerçek program yayımlandıysa: `npm run publish-schedule ...` en az 1 dk önce yapıldı (sunucu önbelleği 60 sn).
- [ ] Yalnızca örnek veri varsa: `DEMO_MODE=true npm run seed-demo` çalıştırıldı.
- [ ] Önceki provanın bildirim/puanları temizlendi: `DEMO_MODE=true npm run seed-demo -- --clear` sonra tekrar `seed-demo`.
      (`--clear` yalnızca `isSimulated` kayıtları siler; gerçek öğrenci bildirimleri provada yapıldıysa konsoldan silinir.)
- [ ] İki telefon (A: sunan, B: jüriye dönük) aynı bağlantıyı açtı; ikisi de **farklı tarayıcı/gizli sekme** (ayrı anonim kullanıcı).
- [ ] Kaynak belge (PDF/XLSX) dizüstünde açık, gösterilecek satır işaretli.
- [ ] Demo saatini seç: gerçek saat 08.00-22.00 dışındaysa ya da o saatte uygun oda azsa `&at=` kullan.
      Örnek veri için iyi bir an: `at=2026-10-27T13:00` (Salı 13.00).

## İlk demo: kendi ders programımızla

- Veri: ekibin kişisel programları, `--coverage PARTIAL` (README "İlk demo" bölümü). Söylenecek:
  "Bu yalnızca bizim derslerimiz; o yüzden uygulama odaya 'boş' demiyor, 'Program kısmi' diyor. Bilinen dersimiz
  varsa odayı listeden çıkarıyor."
- Etkileri göstermek için dizüstünden: `DEMO_MODE=true npm run demo-report -- <oda> dolu` → telefonda 4 sn içinde
  "Dolu bildirildi · Örnek demo verisi". Ardından telefondan gerçek check-in → "Öğrenci doğruladı" (etiketsiz, gerçek).
- Haritada yapay bildirimli odalar `*` ile işaretlidir.

## Akış (DEMO_AND_PITCH.md tablosuyla aynı sıra)

| Adım | A telefonu (sunan) | Söylenecek |
|---|---|---|
| 1 | Harita açılır (demo saati için `/?d=60&at=2026-10-27T13:00` bağlantısı) → alt panel "Şu an N derslik uygun görünüyor" | "Kayıt gerekmez. Haritadaki her şey altta listede de var." |
| 2 | Sağ alttaki **Asistan** → "Çalışacak yer bul" → 60 dakika → Priz → Devam → Fark etmez → "Hayır, konumsuz öner" | "Yapay zekâ API'si yok; kural motoru. Bilmediğini 'bilgi yok' diye söylüyor." |
| 3 | Bir öneride "Ayrıntı ve check-in" → bugünkü program, "Belgedeki yeri", kaynak | "Programda boş ≠ gerçekten boş." |
| 4 | Dizüstünde kaynak belgede aynı satır | "Program kurallarla/Gemini ile ayrıştırıldı, elle kontrol edildi." |
| 5 | B telefonu (jüri) **Liste** sekmesinde. A telefonu basılı QR'ı okutur → "Buradayım, uygun (QR ile check-in)" → "+10 puan" | "Bildirim anonim. B telefonunda 5 saniye içinde 'Öğrenci doğruladı'." |
| 6 | Aynı sayfada 4 kriteri puanla → "Değerlendirmeyi gönder" | "Ortalama 3 değerlendirmeden önce gösterilmez." |
| 7 | **Profil**: puan (+10), seviye → "Aylık ödüller": çay (örnek, 10 puan) "Eşiğe ulaştın; ödül öğrenci girişi açılınca alınabilir" | "Çekiliş değil, eşik + stok. Sponsor yok; ödüller örnek. Öğrenci girişi yakında. Puanlar sıralamayı etkilemez." |
| 8 | (İsteğe bağlı) Terminal: `npm run ingest -- <eski dönem PDF> ...` | "Eski dönem belgesi; yayımlanmaz, yalnızca hat gösterimi." |

Hangi verinin örnek, hangisinin gerçek olduğu sözlü olarak da söylenir.
Google girişi şimdilik kapalı (`NEXT_PUBLIC_GOOGLE_LOGIN` tanımlı değil); açmak için `.env.local`'a `NEXT_PUBLIC_GOOGLE_LOGIN=true`.

## Telefonlarla yerel demo (internet olmadan da)

1. Dizüstü ve telefonlar aynı Wi-Fi'da. Dizüstünün IP'sini bul (macOS: `ipconfig getifaddr en0`).
2. `npm run demo:lan` — emulator'lar yerel ağa açık, örnek veri yüklenir, üretim derlemesi `0.0.0.0:3000`'de açılır
   (ilk derleme ~1 dk). Telefonlarda `http://<dizüstü-ip>:3000/?d=60&at=2026-10-27T13:00`.
   `npm run demo:local` (geliştirme modu) telefondan açılınca sayfa canlanmıyor; telefonlar için `demo:lan` kullan.
3. QR'lar: ayrı terminalde `npm run qr -- --base http://<dizüstü-ip>:3000 --emulator` → `data/qr/qr-tum.html` yazdır.
4. Doğrulandı (bu ortamda, yerel ağ IP'siyle açılan tarayıcıdan check-in). Gerçek telefon + Wi-Fi ile denenmedi; provada dene.
5. `http://` adreste tarayıcılar konum vermez: asistan "Konum alınamadı" deyip mesafesiz önerir. Konumlu demo için
   canlı (https) adres gerekir.
6. macOS güvenlik duvarı açıksa Java (emulator) ve Node için gelen bağlantılara izin ver.

## QR kodlarını hazırlama

- Canlı: `QR_SECRET` App Hosting'de secret olarak tanımlı olmalı (`apphosting.yaml`), `.env.local`'da aynı değer:
  `npm run qr -- --base https://<uygulama-adresi> --building demo-blok` → `data/qr/qr-demo-blok.html` yazdır.
- Yerel demo (`npm run demo:local` açıkken, ayrı terminal): `npm run qr -- --base http://<dizüstü-ip>:3000 --emulator`
  (anahtar `.env.development`'tan gelir). Telefonun dizüstüne erişebildiği doğrulanmadı.
- `data/qr/` gizli imzalı bağlantılar içerir; depoya eklenmez (`.gitignore`).

## Mapbox haritası

- Token repoda değil: yerelde `.env.local` içine `NEXT_PUBLIC_MAPBOX_TOKEN=pk....`, canlıda App Hosting secret'ı (`apphosting.yaml`). Mapbox hesabında (Access tokens → URL restrictions) `http://localhost:3000`,
  dizüstünün yerel ağ adresi ve canlı alan adı izinli olmalı; değilse harita SVG yedeğe döner (uygulama çalışmaya devam eder).
- İnternet yoksa harita kendiliğinden SVG'ye geçer (en geç 10 sn). Demo öncesi Mapbox'ın açıldığını telefonda kontrol et.

## Bilinen tuzaklar

- **macOS: projeyi Masaüstü veya Belgeler'e koyma.** Bu klasörler çoğu zaman iCloud Drive ile eşitlenir; iCloud
  `node_modules` ve `.next` dosyalarını yüklerken okumaları bekletir ve `next dev` (Turbopack)
  "Operation timed out (os error 60)" ile çöker. Projeyi örneğin `~/Projeler/` altına klonla.

- **Aynı odaya 10 dk içinde ikinci bildirim reddedilir.** Provada kullanılan odayı demoda kullanma ya da yeni gizli sekme aç.
- **Puan için önce check-in gerekir**, aynı check-in'e ikinci puan reddedilir — demo sırasında bu mesajlar da gösterilebilir.
- Haritada ortalama için 3 değerlendirme gerekir; örnek veride Ö-102 ve Ö-103'te hazır (\* işaretli = örnek).
- Dev sunucusunda ilk API isteği 10-20 sn sürebilir; demoda canlı (production) bağlantı kullan.
- İnternet yoksa: dizüstünde `npm run demo:local` + telefonlar aynı Wi-Fi'da `http://<dizüstü-ip>:3000`
  (doğrulanmadı: emulator auth'un yerel ağdan erişimi denenmedi; gerekirse yalnızca dizüstünde iki pencere).

## Jüri soruları için hazır ekranlar

- "Gemini yanlış okursa?" → taslak çıktısındaki `needsReview` listesi ve kartta "Program verisi eksik" (Ö-204).
- "Program boş ama oda kilitli?" → kartta "Erişim durumu doğrulanmadı" + "Kullanılamıyor" bildirimi.
- "Kişisel veri?" → Hakkında sayfasındaki gizlilik metni + Profil'deki "Hesabımı ve verilerimi sil".
- Google girişi canlı projede doğrulanmadı (SAÜ öğrenci e-postasının Google Workspace olduğu teyit edilmedi);
  testler Auth Emulator'ın sahte Google kimliğiyle yapıldı. Demoda giriş gösterilecekse önce canlıda denenmeli.
