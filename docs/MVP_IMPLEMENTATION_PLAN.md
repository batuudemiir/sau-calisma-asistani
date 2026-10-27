# MVP_IMPLEMENTATION_PLAN.md

Amaç: Claude Code'un ve ekibin aşama aşama izleyeceği plan. Saatler gerçek etkinlik akışına göre (rehber):
oyun araları 20.00, 04.00, 11.00; yemek 23.00-00.30 ve 10.00-11.00; teslim 28 Ekim 13.00.
Kural: bir aşamanın kabul kriteri karşılanmadan sonrakine geçilmez. Son 90 dakika yalnızca hata düzeltme, README ve prova.

Sıra gerekçesi: en büyük risk veri kaynağı, ikincisi uygunluk motoru. İkisi de arayüzden önce doğrulanır.
Aşama 1 ile Aşama 2 paralel yürür (farklı kişiler).

| # | Saat | İş | Çıktı | Kabul kriteri | Başarısız olursa |
|---|---|---|---|---|---|
| 0 | 18.15-19.00 | Veri kaynağı fizibilitesi: demo binası için güncel, derslik numaralı programı bul ve indir | `data/sources/` içinde dosya + `scheduleSources` taslağı | Belgede gün, saat, ders kodu ve derslik sütunları var; dönem 2026-2027 Güz | Plan B: başka bölüm; o da yoksa ekip üyelerinin programlarıyla elle girilmiş küçük set, "elle derlenmiş" etiketiyle |
| 1 | 18.30-20.00 | Repo iskeleti (Next.js, TS, Tailwind, Vitest), Firebase projesi, Emulator, ilk dağıtım | Çalışan boş sayfa canlı linkte | `npm test` yeşil; canlı link açılıyor | App Hosting sorunluysa Vercel |
| 2 | 18.30-20.00 | `src/domain`: tipler, `availability`, `trust`, `ranking` + T1-T17 testleri | Saf TS modülleri | T1-T17 geçiyor | Kapsamı daralt: T11-T16 sonraya, program kontrolü önce |
| 3 | 20.30-23.00 | Veri hazırlama: ingest (XLSX deterministik veya PDF→Gemini), Zod doğrulama, kalite kuralları, publish | Firestore'da yayımlanmış bloklar | Rastgele 10 kayıt kaynakla birebir; `needsReview` kayıtlar yayında değil | Plan B: Gemini çıktısını elle düzelt, `parseMethod=MANUAL` |
| 4 | 20.30-23.00 | Arayüz: süre seçimi, sonuç listesi, kart (etiket, freeUntil, sonraki ders, kaynak) | `/` ve `/results` | Seed verisiyle T3 durumu ekranda doğru | Ayrıntı sayfası yerine kart içi açılır alan |
| 5 | 00.30-02.30 | `/api/search` Firestore'a bağlı; gerçek veriyle uçtan uca arama | Canlı arama | Demo binasında 3 farklı saat için sonuçlar kaynakla tutarlı | Seed verisine dön, gerçek veriyi sonra bağla |
| 6 | 02.30-04.00 | Anonim oturum, `/api/reports` (Zod, hız sınırı T18), kartta canlı güncelleme | Bildirim akışı | Bildirim sonrası etiket ≤5 sn'de değişiyor; T18 geçiyor | `onSnapshot` yerine bildirim sonrası yeniden sorgu |
| 7 | 04.30-07.00 | Kütüphane kartı: bildirim tabanlı + `DEMO_MODE` simülasyonu, "Örnek demo verisi" etiketi; boş/hata/yükleniyor durumları | Tamamlanmış ana akış | Simülasyon kapalıyken "Doluluk verisi yok" yazıyor | Simülasyonu atla, yalnızca bildirim |
| 8 | 07.00-10.00 | Zaman kalırsa: SVG kat görünümü veya Playwright e2e; görsel cila, erişilebilirlik (kontrast, dokunma alanı) | — | Ana akış bozulmadı, testler yeşil | Atla |
| 9 | 11.30-12.30 | README (amaç, teknolojiler, kurulum, ekip), demo verisi sabitleme, sunum | Teslim dosyaları | README'deki adımlarla temiz klonda çalışıyor | — |
| 10 | 12.30-13.00 | Demo provası (tam 3-5 dk), son commit, teslim | Teslim | Prova zamanında bitti | — |

## Plan A / Plan B
- **Plan A:** Güncel belge ayrıştırılabiliyor → demo tamamen gerçek program verisiyle, Gemini hattı canlı gösterilir.
- **Plan B:** Ayrıştırma çok fazla elle düzeltme istiyor → küçük, kaynakla tek tek kontrol edilmiş set yayımlanır;
  Gemini hattı sunumda eski dönem bir PDF üzerinde ayrıştırıcı testi olarak gösterilir, aktif veri gibi sunulmaz.

## Claude Code için çalışma biçimi
Her aşamada: plan → küçük değişiklik → test → commit. Commit mesajı aşama numarasıyla başlar (`A2: trust kuralları`).
Hackathon kuralı gereği tüm kod bu repoda, 27 Ekim 18.00 sonrasında yazılır.
