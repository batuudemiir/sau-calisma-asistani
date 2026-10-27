# DEMO_AND_PITCH.md

Amaç: Final sunumunun (5 dk sunum + 3-5 dk canlı demo + 2-3 dk soru) içeriğini sabitlemek.
Somut oda, saat ve sayı değerleri yayımlanan gerçek veriye göre son saatte doldurulur; aşağıdakiler yer tutucudur.

## Canlı demo (yaklaşık 3 dakika)

| Adım | Ekranda | Veri türü |
|---|---|---|
| 1 | Öğrenci uygulamayı telefonda açar: "Şimdi nerede çalışabilirsin?" | — |
| 2 | Kütüphane kartı: "Dolu bildirildi · 4 dk önce" veya "Örnek demo verisi" etiketli yoğunluk | Bildirim gerçek; seviye simülasyonsa etiketli |
| 3 | 60 dakika seçer; liste gelir | Gerçek yayımlanmış ders programı |
| 4 | Bir derslik kartını açar: "Programda boş · 15.00'e kadar · Sonraki ders 15.10 · Kaynak: <bölüm> 2026-2027 Güz programı" | Gerçek |
| 5 | Jüriye kaynak belgeyi açıp aynı satırı gösterir | Gerçek belge |
| 6 | "Buradayım, uygun" ile check-in yapar; ikinci telefonda kart "Öğrenci doğruladı" olur | Gerçek bildirim (demo binası) |
| 6b | Alanı 4 kriterle puanlar; haritada (SVG şema) o odanın ortalama puanı görünür | Gerçek değerlendirme; demo öncesi eklenen örnekler "Örnek demo verisi" etiketli |
| 7 | (İsteğe bağlı) Terminalde bir PDF'in Gemini ile taslak JSON'a dönüşmesi ve işaretlenen kayıt | Gerçek hat |

Hangi adımın gerçek, hangisinin simülasyon olduğu sunumda sözlü olarak da söylenir.

## Pitch (60-90 saniye)

Kütüphane doluyken öğrenci boş bir yer aramak için binaları dolaşıyor. Oysa kampüsteki pek çok derslik
o saatte kullanılmıyor; bunu gösteren bilgi de zaten var, sadece bölüm sitelerinde dağınık PDF'ler hâlinde duruyor.

Biz bu mevcut sistemi yeniden tasarladık. Ders programlarını Gemini ile okuyup doğrulama kurallarından geçirerek
ortak bir veri yapısına aktarıyoruz. Öğrenci kaç dakika çalışacağını seçiyor; uygulama o süre boyunca ders
başlamayacak derslikleri, geçiş payını da hesaba katarak listeliyor.

Önemli bir ayrım yapıyoruz: programda boş olmak, gerçekten boş olmak demek değil. Her sonuç kaynağını ve güven
düzeyini gösteriyor; öğrenciler tek dokunuşla doğruluyor. Bugün <bina> için gerçek programla çalışıyor;
kütüphane doluluğu şimdilik öğrenci bildirimiyle ve etiketli demo verisiyle gösteriliyor.

Sonraki adım: üniversiteyle bir pilot. Turnike gibi mevcut sistemlerden yalnızca toplam sayılar alınırsa,
kütüphane doluluğu da tahmin değil ölçüm hâline gelir.

## Beklenen jüri soruları
- **Program boş diyor ama oda kilitli?** → Etiket "Programda boş", erişim "doğrulanmadı" yazıyor; öğrenci bildirimi düzeltiyor.
- **Gemini yanlış okursa?** → Şema zorunlu, belirsiz alan boş kalır, kurallar işaretler, yayından önce elle kontrol. Uygunluğu AI değil kural motoru hesaplıyor.
- **Bu dünyada var mı?** → Benzerleri var (BU EmptyClassroom, Bryant RoomFinder). Farkımız SAÜ'nün dağınık belgeleri, süre odaklı arama ve dürüst güven etiketleri.
- **Kişisel veri?** → Giriş isteğe bağlı. Girişsiz kullanımda yalnızca anonim oturum kimliği var. Öğrenci girişinde
  e-posta veritabanımıza yazılmaz (yalnızca Firebase Auth'ta); puanlar yalnızca kişiye görünür ve hesap tek dokunuşla
  silinir. KVKK konusunda garanti vermiyoruz; aydınlatma metni taslağı Hakkında sayfasında.
- **Kart/turnike verisi?** → Erişimimiz yok, varmış gibi göstermiyoruz. Pilot önerisi olarak anlatıyoruz.
