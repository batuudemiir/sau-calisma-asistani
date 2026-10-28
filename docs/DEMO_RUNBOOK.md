# DEMO_RUNBOOK.md

Amaç: Canlı demonun (3-5 dk) adım adım provası. `DEMO_AND_PITCH.md` neyin anlatılacağını, bu belge nasıl yapılacağını söyler.

## Jüri sunumu: Vercel prototipi (Firebase'siz)

Hazırlık (T-30 dk):
- [ ] Vercel bağlantısı açılıyor. Uygulama bir süre boşta kaldıysa ilk açılış birkaç saniye sürebilir; sunumdan
      hemen önce bir kez aç (veri her yeniden başlatmada sıfırlanır, bu beklenen durum).
- [ ] Ö-201 (veya başka bir Örnek Blok odası) QR'ı basılı: `QR_SECRET=<Vercel'deki> npm run qr -- --base https://<proje>.vercel.app --demo`.
- [ ] Sunum telefonunda bağlantı **gizli sekmede** açık (temiz cihaz kimliği: 0 puan).
- [ ] Demo saati bağlantısı hazır: `https://<proje>.vercel.app/?d=60&at=2026-10-28T13:00`
      (gerçek saat 08.00-22.00 dışındaysa ekrandaki "Sunum için bugün 13.00'e göre göster" de aynı işi yapar).

Ekranda her zaman görünen örnek veri (hepsi "Örnek demo verisi" etiketli): Örnek Blok'un 8 odası ve ders programı,
haritada kesik çizgiyle "temsili konum"; her an "x dk önce" yapılmış 3 örnek bildirim (Ö-104 ve Lumo Coffee
"Öğrenci doğruladı", Ö-203 "Dolu bildirildi"); örnek değerlendirmeler; kütüphane yoğunluk deseni; 3 örnek ödül.

| Adım | Ekran | Söylenecek |
|---|---|---|
| 1 | Harita (13.00 demo saati): Örnek Blok "N oda", alt panel "Şu an N derslik uygun görünüyor" | "Kayıt yok. Renk tek başına anlam taşımaz; her şey listede de var." |
| 2 | Örnek Blok'a dokun → kat görünümü: Doğrulandı / Programda boş / Dolu / Bilinmiyor / Uygun değil | "Programda boş ≠ gerçekten boş. Bilinmeyen asla 'boş' gösterilmez." |
| 3 | Asistan → Çalışacak yer bul → 60 dk → Priz → Devam → Fark etmez → konumsuz | "Yapay zekâ API'si yok; kural motoru, gerekçesini ve bilmediğini yazar." |
| 4 | Liste → Ö-104 kartı: "Öğrenci doğruladı · 4 dk önce", kaynak satırı | "Güven etiketi ve kaynak her kartta." |
| 5 | Basılı QR'ı okut → "Buradayım, uygun (QR ile check-in)" → "+10 puan" → 4 kriteri puanla | "QR kanıtı imzalı; sahte kod reddedilir." |
| 6 | Profil → 10 puan → "Örnek öğrenci hesabıyla devam et" → "Kampüs kafesinde çay — ödülü al" → `ORNEK-…` kupon | "Eşik + stok, çekiliş değil. Gerçekte SAÜ Google hesabıyla; burada örnek hesap. Kupon geçersiz örnek." |
| 7 | Profil → "Hesabımı sil" (isteğe bağlı) | "KVKK: kişisel veri silinir, bildirim anonim topluluk verisi olarak kalır." |

Bilinen sınır: veri sunucunun belleğinde; Vercel istekleri farklı örneklere dağıtırsa ikinci telefonda bildirim
görünmeyebilir (doğrulanmadı). Bu yüzden akış tek telefonla kurgulandı.

## Demo öncesi (T-30 dk, Firebase/yerel demo)

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
- Vercel prototipi (Firebase'siz): `QR_SECRET=<Vercel'dekiyle aynı> npm run qr -- --base https://<proje>.vercel.app --demo`.
- `data/qr/` gizli imzalı bağlantılar içerir; depoya eklenmez (`.gitignore`).

## Bilinen tuzaklar

- Vercel prototipi (`NEXT_PUBLIC_DEMO_BACKEND=memory`) veriyi bellekte tutar: yeni dağıtım veya soğuk başlangıç
  bildirimleri ve puanları sıfırlar. İki telefonun aynı bildirimi görmesi garanti değil (doğrulanmadı); bu sahneyi
  tek telefonla göster ya da yerel demoyu (`demo:lan`) kullan.

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
