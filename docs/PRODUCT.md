# PRODUCT.md

Amaç: Ürünün ne olduğunu, kimin için olduğunu ve ilk sürümün sınırlarını sabitlemek.
Araştırma tarihi: 27 Ekim 2026.

## Değer önerisi
Kütüphanede yer bulamayan SAÜ öğrencisine, seçtiği süre boyunca çalışabileceği alanları
bilginin kaynağı ve güven düzeyiyle birlikte tek ekranda gösteren çalışma asistanı.

## Hackathon teması ile bağ
Resmi tema: "Kampüs yaşamındaki mevcut bir sistemi daha verimli hale getirecek şekilde yeniden tasarlamak."
Mevcut sistem: bölüm sitelerine dağılmış ders programları ve atıl kalan derslikler. Bu programları ortak bir
veri yapısında toplayıp öğrencinin yer arama sorununa bağlıyoruz.

## Hedef kullanıcı
Dersleri arasında 30-120 dakika boşluğu olan, kütüphanede yer bulamayan, bireysel ve sakin çalışmak isteyen öğrenci.

## Temel ürün ilkesi
Programda boş görünen derslik, gerçekten boş olduğu doğrulanmış derslik değildir. Bu ayrım veri modelinde,
algoritmada, arayüz metninde ve testlerde korunur. Bilinmeyen bilgi asla olumlu kabul edilmez.

## Kullanıcı akışı
1. Ana ekran **Şimdi** (`/`): "Ne zaman çalışacaksın?" — gün (Bugün, Yarın, sonraki 5 gün) + başlangıç saati çipleri (Şimdi ya da
   08.00–21.30) + süre çipleri (30 dk–4 sa, en geç 22.00; gün çizelgesinde gösterilir) → "Şu an boş sınıflar" / "13.00–15.00 arası boş sınıflar": kartta yalnızca
   sınıf, bina, durum ve "17.00'ye kadar"; doğrulanmışlar üstte, dolu/bilinmeyenler açılır bölümde. Altında
   "Kütüphane ve kafeler". Filtreler: Sessiz, Priz var, Şu an açık (bilinmeyen filtreye girmez). Kayıt gerekmez.
2. **Harita** sekmesi (`/harita`, gerçek OSM konumları): binadaki sayı = boş sınıf; binaya dokununca kat görünümü.
   Haritadaki her bilgi alt panelde metin olarak da vardır.
3. Sınıf/yer ayrıntısı: büyük durum + ne zamana kadar boş, "Buradayım" düğmesi, bugünkü dersler, puanlar;
   kaynak belge ve son bildirimler "Bilgi kaynağı" bölümünde.
4. Bildirim: "Buradayım, uygun (check-in)" / "Dolu" / "Kullanılamıyor" / "Bilgi güncel değil" — tek dokunuş.
   "Buradayım, uygun" aynı zamanda check-in'dir; ayrı bir check-in kaydı yoktur.
5. Değerlendirme: check-in yapan öğrenci, 3 saat içinde o alanı sabit kriterlere 1-5 puanla değerlendirir
   (Sessizlik, Priz, İnternet, Işık). Serbest metin yok.
6. Harita: gerçek ölçekli SVG kampüs (sürükle/yakınlaştır) → bina paneli/kat şeması; her alanda durum etiketi (metin)
   ve ortalama puan. Kat görünümü için "Şematik çizim, ölçekli değildir" notu.
7. Profil (isteğe bağlı): SAÜ öğrenci hesabıyla (Google) giriş, kişisel puan ve seviye, son katkılar, hesap silme.
8. Asistan: haritanın sağ altında yuvarlak düğme. Sorularla ilerler (kaç dakika, neye ihtiyacın var, nerede,
   konumunu kullanayım mı) ve en iyi 3 yeri gerekçesiyle önerir. Kural tabanlıdır, yapay zekâ API'si çağırmaz;
   bilmediğini "bilgi yok" diye söyler. Konum yalnızca cihazda kullanılır, sunucuya gitmez.
9. QR ile check-in: derslik kapısındaki QR okutulur → doğrulanmış check-in (+10 puan) → geri bildirim (değerlendirme).
   Basılı QR'ın fotoğrafı paylaşılabildiği için kesin kanıt değildir; kısa sürede çok hesaptan kullanılan QR bonus vermez.
10. Aylık ödüller: ay içinde eşiğe ulaşan doğrulanmış SAÜ öğrencisi, stok bitene kadar her ödülden ayda bir kez
    alır. Çekiliş değildir (çekiliş Milli Piyango İdaresi izni gerektirir). Sponsor bulunana kadar ödüller örnek demo verisidir.
   Puanlar yalnızca kişiye görünür; sonuçları etkilemez.

## MVP sınıflandırması

| Sınıf | Özellik | Neden |
|---|---|---|
| Zorunlu | Süre seçimi ve sonuç listesi | Ürünün tek sorusuna cevap |
| Zorunlu | Gerçek ders programından küçük doğrulanmış veri seti (tek bina) | Teknik Başarı ve dürüstlük |
| Zorunlu | Deterministik uygunluk motoru + birim testleri | Ürünün çekirdeği, jüri sorusuna cevap |
| Zorunlu | Güven etiketleri ve kaynak gösterimi | Sahte kesinlik vermemek |
| Zorunlu | Kullanıcı bildirimi (anonim oturum, hız sınırı) | Programdaki boşluğu gerçekliğe bağlar |
| Zorunlu | Kütüphane kartı: bildirim tabanlı veya etiketli simülasyon | Demo hikâyesinin başlangıcı |
| Zorunlu | Gemini ile belge ayrıştırma hattı (en az bir gerçek belge) | Google teknolojisinin anlamlı kullanımı |
| Zorunlu | Check-in sonrası değerlendirme (4 kriter, 1-5) | Öğrenci deneyimini alana bağlar; programda olmayan bilgi |
| Zorunlu | SVG kampüs/bina şeması: durum + ortalama puan | Değerlendirmelerin harita üzerinde görünmesi; paket gerektirmez |
| Zaman kalırsa | Kütüphane doluluk simülasyonu (gün içi desen) | "Gelecek KART entegrasyonu" anlatısı |
| Zorunlu (eklendi) | Harita ana ekran, arama/filtre, isteğe bağlı öğrenci girişi, kişisel puan ve profil | Bulunabilirlik ve katkıyı sürdürme |
| Sonraya | Google Maps kampüs haritası, SAÜ KART / turnike entegrasyonu, sensör, ML tahmin, yönetim paneli, rozetler, herkese açık sıralama | Veri erişimi yok veya 24 saatte değer üretmez |

## Mevcut alternatiflerden farkı
Benzer "boş derslik" uygulamaları dünyada var (örn. Boston University EmptyClassroom, Bryant RoomFinder).
Fark: SAÜ'nün dağınık belgelerini Gemini + doğrulama hattıyla ortak şemaya çevirmek, süreye göre uygunluk,
program bilgisi ile gerçek durumun ayrılması ve öğrenci doğrulaması. "İlk kez yapılan" diye konumlandırılmaz.

## İlk sürümün başarı ölçütü
Demo binasındaki her derslik için, seçilen 60 dakikalık aralıkta, uygulamanın verdiği "Programda boş" sonucu
kaynak belgeyle elle kontrol edildiğinde hatasız; bildirim yapıldığında etiket 5 saniye içinde güncelleniyor.

## Açık varsayımlar
- Demo binası olarak ekibin bildiği İşletme Fakültesi önerilir; güncel ve derslik numaralı program bulunamazsa
  başka bir bölüm seçilir (bkz. MVP planı, Aşama 0).
- Odaların öğrenci kullanımına açık olup olmadığı bilinmiyor; her kartta "Erişim durumu doğrulanmadı" yazar.
- Sınav, tatil, iptal ve program dışı etkinlik verisi yok; bu durum arayüzde belirtilir.
- Puanlar uygunluk etiketini ve sıralamayı etkilemez. 3'ten az değerlendirme varsa ortalama gösterilmez.
- Harita yerleşimi ekip tarafından çizilir; kaynak veri gibi sunulmaz.
