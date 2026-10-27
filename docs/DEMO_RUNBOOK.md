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

| Adım | A telefonu | Söylenecek |
|---|---|---|
| 1 | Harita ana ekranı açılır (60 dk varsayılan; demo saati için `/?d=60&at=...` bağlantısı) → alt panel "Şu an N derslik uygun görünüyor" → **Liste** sekmesi | "Kayıt gerekmez, konum izni istemeyiz." |
| 2 | Kütüphane kartı: "Doluluk verisi yok" + yoğunluk "Örnek demo verisi" | "Kütüphane seviyesi **simülasyon**; ölçüm değil." |
| 3 | Liste: etiketler, "… saatine kadar boş (programa göre)", sonraki ders, kaynak | "Programda boş ≠ gerçekten boş." |
| 4 | Bir kartı aç: bugünkü program, "Belgedeki yeri" | — |
| 5 | Dizüstünde kaynak belgede aynı satırı göster | "Veri Gemini/kurallarla ayrıştırıldı, elle kontrol edildi." |
| 6 | **Buradayım, uygun (check-in)** → B telefonunda kart 5 sn içinde "Öğrenci doğruladı" | "Bildirim anonim; uid istemciye hiç gitmez." |
| 6b | Aynı ekranda 4 kriteri puanla ("+5 puan kazandın") → **Harita** sekmesi → panelde bina → oda rozeti | "Ortalama 3 değerlendirmeden önce gösterilmez." |
| 6a | Haritada sağ alttaki **Asistan** → "Çalışacak yer bul" → 60 dk → Priz → Fark etmez → konum | "Yapay zekâ API'si yok; kural motoru. Bilmediğini 'bilgi yok' diye söylüyor. Konum telefondan çıkmıyor." |
| 6d | Basılı QR'ı (veya ekrandaki QR'ı) B telefonuyla okut → "QR ile check-in" (+10) → geri bildirim | "QR fotoğrafı paylaşılabilir; kesin kanıt değil, kısa sürede çok hesap kullanırsa bonus kesilir." |
| 6e | Profil → **Aylık ödüller**: çay (örnek, 10 puan) → giriş → "ödülü al" → `ORNEK-` kupon | "Çekiliş değil, eşik + stok. Sponsor yok; ödüller örnek, kupon geçersiz." |
| 6c | **Profil** sekmesi: puan, seviye, son katkılar; "SAÜ hesabıyla giriş yap" | "Giriş isteğe bağlı; puanlar yalnızca sana görünür, sıralamayı etkilemez." |
| 7 | (İsteğe bağlı) Terminal: `npm run ingest -- <eski dönem PDF> ...` → işaretli kayıtlar | "Eski dönem belgesi; yayımlanmaz, yalnızca hat gösterimi." |

Hangi verinin örnek, hangisinin gerçek olduğu sözlü olarak da söylenir.

## QR kodlarını hazırlama

- Canlı: `QR_SECRET` App Hosting'de secret olarak tanımlı olmalı (`apphosting.yaml`), `.env.local`'da aynı değer:
  `npm run qr -- --base https://<uygulama-adresi> --building demo-blok` → `data/qr/qr-demo-blok.html` yazdır.
- Yerel demo (`npm run demo:local` açıkken, ayrı terminal): `npm run qr -- --base http://<dizüstü-ip>:3000 --emulator`
  (anahtar `.env.development`'tan gelir). Telefonun dizüstüne erişebildiği doğrulanmadı.
- `data/qr/` gizli imzalı bağlantılar içerir; depoya eklenmez (`.gitignore`).

## Bilinen tuzaklar

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
