# DEMO_AND_PITCH.md

Amaç: Final sunumunun (5 dk sunum + 3-5 dk canlı demo + 2-3 dk soru) içeriğini sabitlemek.
Somut oda, saat ve sayı değerleri yayımlanan gerçek veriye göre son saatte doldurulur; aşağıdakiler yer tutucudur.

## Canlı demo (yaklaşık 4 dakika)

| Adım | Ekranda | Veri türü |
|---|---|---|
| 1 | Telefonda **neredeçalışalım** açılır: kampüs haritası (Mapbox), altta "Şu an N derslik uygun görünüyor" | Konumlar gerçek (OSM); oda durumları yayımlanan programdan |
| 2 | Sağ alttaki **asistan**: "Çalışacak yer bul" → 60 dk → Priz → Fark etmez → en iyi 3 öneri, gerekçe ve "bilgi yok" uyarılarıyla | Kural motoru; yapay zekâ API'si yok |
| 3 | Bir öneriyi açar: "Programda boş · 15.00 saatine kadar · Sonraki ders 15.10 · Kaynak: <bölüm> programı" | Gerçek program (yoksa "Örnek demo verisi") |
| 4 | Jüriye kaynak belgeyi açıp aynı satırı gösterir | Gerçek belge |
| 5 | Kapıdaki **QR** okutulur → "QR ile check-in" (+10 puan) → ikinci telefonda kart 5 sn içinde "Öğrenci doğruladı" | Gerçek bildirim |
| 6 | Hemen ardından 4 kriterle geri bildirim ("Burayı değerlendirelim") | Gerçek değerlendirme; hazır örnekler etiketli |
| 7 | **Profil**: puan, seviye, aylık ödül ilerlemesi (öğrenci girişi yakında; açılınca kupon alınır) | Puan gerçek; ödüller örnek (sponsor yok) |
| 8 | (İsteğe bağlı) Terminalde PDF → Gemini → taslak JSON ve işaretlenen kayıt | Gerçek hat |

Hangi adımın gerçek, hangisinin örnek olduğu sunumda sözlü olarak da söylenir.

## Pitch (60-90 saniye)

Kütüphane doluyken öğrenci boş bir yer aramak için binaları dolaşıyor. Oysa kampüsteki pek çok derslik
o saatte kullanılmıyor; bunu gösteren bilgi zaten var, sadece bölüm sitelerinde dağınık belgeler hâlinde duruyor.

neredeçalışalım bu bilgiyi tek haritada topluyor. Ders programlarını Gemini ile okuyup doğrulama kurallarından
geçiriyoruz. Öğrenci kaç dakika çalışacağını seçiyor ya da asistana soruyor; uygulama o süre boyunca ders
başlamayacak derslikleri ve kampüsteki çalışma yerlerini gerekçeleriyle öneriyor.

Önemli bir ayrım yapıyoruz: programda boş olmak, gerçekten boş olmak demek değil. Her sonuç kaynağını ve güven
düzeyini gösteriyor. Öğrenciler kapıdaki QR'ı okutup "buradayım" diyor, sessizlik, priz, internet ve ışığı
puanlıyor; bu katkılar diğer öğrencilere anında yansıyor ve katkı yapan puan kazanıyor.

Sonraki adım: üniversiteyle bir pilot ve kampüs kafeleriyle ödül iş birliği. Turnike gibi mevcut sistemlerden
yalnızca toplam sayılar alınırsa kütüphane doluluğu da tahmin değil ölçüm hâline gelir.

## Beklenen jüri soruları
- **Program boş diyor ama oda kilitli?** → Etiket "Programda boş", erişim "doğrulanmadı" yazıyor; öğrenci bildirimi düzeltiyor.
- **Gemini yanlış okursa?** → Şema zorunlu, belirsiz alan boş kalır, kurallar işaretler, yayından önce elle kontrol. Uygunluğu AI değil kural motoru hesaplıyor.
- **Bu dünyada var mı?** → Benzerleri var (BU EmptyClassroom, Bryant RoomFinder). Farkımız SAÜ'nün dağınık belgeleri, süre odaklı arama ve dürüst güven etiketleri.
- **Kişisel veri?** → Giriş isteğe bağlı. Girişsiz kullanımda yalnızca anonim oturum kimliği var. Öğrenci girişinde
  e-posta veritabanımıza yazılmaz (yalnızca Firebase Auth'ta); puanlar yalnızca kişiye görünür ve hesap tek dokunuşla
  silinir. KVKK konusunda garanti vermiyoruz; aydınlatma metni taslağı Hakkında sayfasında.
- **Kart/turnike verisi?** → Erişimimiz yok, varmış gibi göstermiyoruz. Pilot önerisi olarak anlatıyoruz.
- **Asistan yapay zekâ mı?** → Hayır; kural tabanlı öneri motoru (`src/domain/assistant.ts`), testli. Her önerinin
  gerekçesini yazıyor, bilmediğini "bilgi yok" diye söylüyor. Gemini yalnızca belge ayrıştırmada, sunucusuz ve elle kontrollü.
- **QR ile hile?** → Basılı QR'ın fotoğrafı paylaşılabilir; kesin kanıt demiyoruz. Kod sunucu anahtarıyla imzalı, aynı yerde
  10 dakikada 8 farklı hesap kullanırsa QR bonusu kesiliyor, puanlar güven etiketini ve sıralamayı hiç etkilemiyor.
- **Ödüller çekiliş mi?** → Hayır, eşik + stok (çekiliş izin gerektirir). Şu an sponsor yok; ödüller "Örnek demo verisi",
  kuponlar geçersiz.
- **Konumum nereye gidiyor?** → Hiçbir yere. Asistan konumu yalnızca telefonda mesafe hesabı için kullanıyor; harita
  görüntüleri Mapbox'tan geliyor, konum Mapbox'a da gönderilmiyor.
