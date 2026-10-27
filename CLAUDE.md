# CLAUDE.md — SAÜ Çalışma Asistanı

"Şu an nerede çalışabilirim?" — SAÜ öğrencisine seçtiği süre (30/60/90/120 dk) boyunca
uygun görünen çalışma alanlarını, bilginin kaynağı ve güven etiketiyle listeleyen mobil uyumlu web uygulaması.
GDG on Campus SAÜ Hackathon, 27-28 Ekim 2026. Teslim: 28 Ekim 13.00.

## Önce oku
- `docs/PRODUCT.md` — kapsam, MVP, kapsam dışı
- `docs/ARCHITECTURE.md` — mimari, veri modeli, veri hazırlama, güvenlik, dağıtım
- `docs/AVAILABILITY_RULES.md` — uygunluk motoru ve güven kuralları (testleriyle)
- `docs/MVP_IMPLEMENTATION_PLAN.md` — aşamalar ve kabul kriterleri
- `docs/DEMO_AND_PITCH.md` — demo akışı

## Sabit kurallar
1. Dar kapsamlı çalış; bir aşamanın kabul kriterleri karşılanmadan sonrakine geçme.
2. Her değişiklikten sonra `npm test` çalıştır; yeni davranışa test ekle.
3. Uygunluk mantığı `src/domain/` içinde saf TypeScript'tir. React bileşenine veya Firestore koduna gömülmez.
4. Gemini yalnızca `scripts/ingest/` içinde, geliştiricinin makinesinde çalışır. Web uygulaması Gemini'yi asla çağırmaz.
5. Kaynakta olmayan oda, saat, ders veya doluluk bilgisi uydurma. Bilinmeyen = `UNKNOWN`, asla "boş".
6. Simüle edilen her veri `isSimulated: true` taşır ve arayüzde "Örnek demo verisi" etiketiyle görünür.
7. API anahtarı, token veya kullanıcı kimliği loglama. Gizli anahtar istemci paketine girmez (`NEXT_PUBLIC_` önekli değişkenler hariç, onlar gizli değildir).
8. Firestore'a istemciden yazma yok; yazmalar Route Handler + Admin SDK üzerinden, Zod doğrulamasıyla.
9. Kullanılmayan paket, özellik, harita kütüphanesi ekleme.
10. Doğrulanmamış bir entegrasyonun veya özelliğin çalıştığını iddia etme. Emin değilsen "doğrulanmadı" yaz.
11. Tarih/saat her yerde `Europe/Istanbul`. Gün içi zamanlar gece yarısından itibaren dakika (`startMinute`).

## Komutlar
- `npm run dev` — geliştirme sunucusu
- `npm test` — Vitest
- `npm run ingest -- <dosya>` — kaynak belgeyi taslak JSON'a çevirir (`data/drafts/`)
- `npm run publish-schedule -- <taslak>` — onaylanmış taslağı Firestore'a yükler
- `npm run seed-demo` — demo binası, odalar ve etiketli simülasyon verisi
