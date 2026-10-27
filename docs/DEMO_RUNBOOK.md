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

## Akış (DEMO_AND_PITCH.md tablosuyla aynı sıra)

| Adım | A telefonu | Söylenecek |
|---|---|---|
| 1 | Ana sayfa → **60 dakika** (demo saati gerekiyorsa adres çubuğuna `&at=...` ekli bağlantı) | "Kayıt yok, konum izni yok." |
| 2 | Kütüphane kartı: "Doluluk verisi yok" + yoğunluk "Örnek demo verisi" | "Kütüphane seviyesi **simülasyon**; ölçüm değil." |
| 3 | Liste: etiketler, "… saatine kadar boş (programa göre)", sonraki ders, kaynak | "Programda boş ≠ gerçekten boş." |
| 4 | Bir kartı aç: bugünkü program, "Belgedeki yeri" | — |
| 5 | Dizüstünde kaynak belgede aynı satırı göster | "Veri Gemini/kurallarla ayrıştırıldı, elle kontrol edildi." |
| 6 | **Buradayım, uygun (check-in)** → B telefonunda kart 5 sn içinde "Öğrenci doğruladı" | "Bildirim anonim; uid istemciye hiç gitmez." |
| 6b | Aynı ekranda 4 kriteri puanla → **Haritada gör** → bina → oda rozeti | "Ortalama 3 değerlendirmeden önce gösterilmez." |
| 7 | (İsteğe bağlı) Terminal: `npm run ingest -- <eski dönem PDF> ...` → işaretli kayıtlar | "Eski dönem belgesi; yayımlanmaz, yalnızca hat gösterimi." |

Hangi verinin örnek, hangisinin gerçek olduğu sözlü olarak da söylenir.

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
- "Kişisel veri?" → bildirim formundaki not: "ad, e-posta veya konum saklanmaz".
