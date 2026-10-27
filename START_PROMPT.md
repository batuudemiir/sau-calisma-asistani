# Claude Code başlangıç promptu

Aşağıdaki metni, bu klasörü repo köküne koyduktan sonra Claude Code'a ilk mesaj olarak ver.

---

Bu repo GDG on Campus SAÜ Hackathon (27-28 Ekim 2026, teslim 28 Ekim 13.00) için "Şu An Nerede Çalışabilirim?"
web uygulaması. Hackathon kuralı gereği tüm kod bu oturumda yazılacak.

1. Önce `CLAUDE.md` ve `docs/` altındaki beş belgeyi oku. Belgelerle çelişen bir şey görürsen kod yazmadan önce bana söyle.
2. Bütün uygulamayı tek seferde üretme. Plan Mode'da yalnızca `docs/MVP_IMPLEMENTATION_PLAN.md` Aşama 1 ve Aşama 2 için
   plan hazırla: kurulacak paketler (güncel kararlı sürümleri kurulumda kontrol et), oluşturulacak dosyalar, yazılacak testler.
3. Onayımdan sonra önce Aşama 2'yi bitir: `src/domain` içinde tipler, `availability`, `trust`, `ranking` ve
   `docs/AVAILABILITY_RULES.md` içindeki T1-T17 testleri. Testler geçmeden arayüze geçme.
4. Sonra Aşama 1 iskeletini ve ilk dağıtımı kur. Firebase projesi ve anahtarlar için ne gerektiğini bana adım adım söyle;
   anahtarları ben gireceğim, `.env.example` dışında hiçbir gizli değer yazma.
5. Her aşama sonunda: hangi kabul kriterinin karşılandığını, hangi testlerin geçtiğini ve neyin doğrulanmadığını kısaca raporla, commit at.

Uygunluk mantığını UI'a gömme, Gemini'yi öğrenci akışında çağırma, kaynakta olmayan veri uydurma, simülasyonu etiketlemeden gösterme.
