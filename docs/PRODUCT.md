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
1. Ana sayfa: "Şimdi nerede çalışabilirsin?" ve süre seçimi (30/60/90/120). Kayıt yok, konum izni yok.
2. Sonuç listesi: alan kartları, güven etiketine göre sıralı. Kütüphane kartı en üstte, kendi etiketiyle.
3. Alan ayrıntısı: boş kalacağı süre, sonraki ders, kaynak belge ve dönemi, son bildirimler.
4. Bildirim: "Buradayım, uygun" / "Dolu" / "Kullanılamıyor" / "Bilgi güncel değil" — tek dokunuş.

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
| Zaman kalırsa | Basit bina/kat görünümü (SVG) | UX/UI puanı; liste değeri zaten kanıtlar |
| Zaman kalırsa | Kütüphane doluluk simülasyonu (gün içi desen) | "Gelecek KART entegrasyonu" anlatısı |
| Sonraya | Google Maps kampüs haritası, SAÜ KART / turnike entegrasyonu, sensör, ML tahmin, yönetim paneli, profiller, oyunlaştırma | Veri erişimi yok veya 24 saatte değer üretmez |

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
