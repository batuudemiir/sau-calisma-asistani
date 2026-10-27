# CAMPUS_RESEARCH.md

Amaç: Esentepe kampüsü hakkında uygulamaya giren bilginin nereden geldiğini, neyin doğrulandığını ve neyin eksik
olduğunu kayıt altına almak. Araştırma tarihi: 27 Ekim 2026.

## Erişim kısıtı

Geliştirme ortamının ağ politikası `*.sakarya.edu.tr` (SABİS ders programı `dersprogram.sabis.sakarya.edu.tr` dahil),
openstreetmap.org, Overpass ve web.archive.org adreslerine erişime izin vermiyor. Bu yüzden:

- Resmî sayfalar yalnızca arama motoru özetleri üzerinden okundu (aşağıda bağlantılı).
- Konum verisi, GitHub'da yayımlanmış OpenStreetMap türevi bir GeoPackage'dan alındı.
- **Derslik listeleri ve ders programları henüz yok.** SABİS ders programı sitesine erişim açılınca içe aktarıcı yazılacak.

## Konum verisi (gerçek, ölçekli)

- Kaynak: [numanak-b221210105/sau-kampus-qgis-harita](https://github.com/numanak-b221210105/sau-kampus-qgis-harita) →
  `sau_kampus.gpkg` (QuickOSM ile OpenStreetMap'ten alınmış; TUREF/TM30, EPSG:5254).
- Lisans: © OpenStreetMap katkıda bulunanlar, [ODbL 1.0](https://www.openstreetmap.org/copyright). Uygulamada harita altında atıf var.
- Dönüşüm: `scripts/campus/gpkg_to_json.py` (yalnızca Python standart kütüphanesi; ters Transverse Mercator, GRS80, 30°D).
  Çıktı `data/campus/esentepe-osm.json`: kampüs sınırı + sınır içindeki **181 bina** (43'ü adlı), her biri OSM kimliğiyle.
- Doğrulama: kampüs sınırı 40,736–40,748 K / 30,322–30,341 D; resmî tanımla tutarlı (Sapanca Gölü'nün kuzey
  yamacı, Serdivan, yaklaşık 2.000 dönüm). Her bina `https://www.openstreetmap.org/way/<id>` ile tek tek kontrol edilebilir.
- Uyarı: OSM gönüllü verisidir; adlar eksik/eski olabilir, verinin alındığı tarih bilinmiyor.

## Kampüste ne nerede (`src/data/campus.ts`)

### Çalışma yerleri

| Yer | OSM | Bilgi | Kaynak |
|---|---|---|---|
| Süleyman Demirel Kütüphanesi (Merkez) | way/389702261 | A Blok 7/24; ~10.000 m²; eş zamanlı 1.650 kişi; A ve B Blok 1. katta çalışma salonları | [Aday öğrenci sayfası](https://adayogrenci.sakarya.edu.tr/v2/?lang=en&pg=syf&sayfa=kutuphaneler&id=58), OSM `opening_hours=24/7` |
| Kütüphane Ek Bina | way/389702294 | OSM'de 24/7, 4 kat | OSM |
| Sessiz çalışma salonu (B Blok 2. kat) | — | **Yalnızca akademik personel ve lisansüstü**, hafta içi 09.00-17.00 — lisans öğrencisine önerilmez | [Kütüphane duyurusu](https://kutuphane.sakarya.edu.tr/tr/duyuru/goster/124101/sessiz-calisma-salonu-akademik-personel-ve-lisansustu-ogrencilere-ozel) |
| Kampüs Kafeterya | way/389702253 | OSM'de kafe | OSM |
| Kantin | way/389850269 | OSM'de kafe | OSM |
| Taş Kafe | way/389850270 | OSM'de kafe | OSM |
| Lumo Coffee Sakarya Kampüs | way/1490211563 | OSM'de kafe, kampüs sınırı içinde | OSM |

Kafelerin açılış saatleri ve çalışmaya uygunluğu bilinmiyor; uygulamada "Açılış saatleri bilinmiyor" yazar,
doluluk yalnızca öğrenci bildirimiyle gösterilir.

Kapasite farklılığı: eski sayfalarda 730 kişi / 6.721 m² ve 1.300 kişi geçiyor; en güncel resmî sayfa 1.650 kişi / 10.000 m².

### Fakülteler ve öğretim binaları (OSM'de adı ve konumu olanlar)

Bilgisayar ve Bilişim Bilimleri Fakültesi · Fen Edebiyat Fakültesi · Hukuk Fakültesi · İlahiyat Fakültesi ·
Sanat, Tasarım ve Mimarlık Fakültesi · İnsan ve Toplum Bilimleri Fakültesi · Devlet Konservatuvarı ·
Mühendislik Fakültesi Dekanlığı, M2, M4, M6, M7 (Makine), İnşaat Mühendisliği · Fen Bilimleri Enstitüsü.
SUBÜ (Sakarya Uygulamalı Bilimler Üniversitesi) binaları da kampüste: T1, T3, T4, Spor Bilimleri Fakültesi
— uygulamada üniversite adıyla belirtilir.

### Laboratuvar ve araştırma merkezleri

Bilgisayar Araştırma ve Uygulama Merkezi (BAUM) · Malzeme Yüzey Teknolojileri Laboratuvarı ·
Termal Sprey Araştırma ve Uygulama Laboratuvarı (OSM). Arama sonuçlarındaki SABİS mekân özetine göre
M7 yaklaşık 890 m², M2 yaklaşık 863 m² laboratuvar alanına sahip; M3 derslik binası (ör. 3104, 3203, 3204 derslikleri)
— bu değerler arama özetinden, resmî tablo görülmeden alındı, doğrulanmadı.

### Konumu açık kaynakta bulunamayanlar (uygulamada konum uydurulmaz)

- İşletme, Siyasal Bilgiler, İletişim, Sağlık Bilimleri fakülteleri (kampüste oldukları resmî adres ve kampüs haritası
  PDF'inin metninden biliniyor; bina eşleşmesi yok)
- Mühendislik M1, M3, M5, M8, M9
- "Kitap Keyfi" kitap-kahve (haberlere göre kampüs merkezinde açıldı; konum yok, güncel durumu bilinmiyor)
- "Kalem, Kitap ve Kahve Evi" (yapım aşamasında olduğu haberlerde geçiyor)

Bu boşluklar için iki yol: (1) ekip kampüste binaları OSM'de doğrular/ekler, `gpkg_to_json.py` yerine güncel OSM
dışa aktarımı kullanılır; (2) resmî kampüs haritası PDF'i (`tanitim.sakarya.edu.tr/kampusharitasi.pdf`) erişim açılınca okunur.

## Derslikler ve ders programı

- Kullanıcı ders listesi girmez. Derslikler ve programlar **ekip tarafından** resmî kaynaktan alınıp yayımlanır.
- Hedef kaynak: SABİS ders programı (`dersprogram.sabis.sakarya.edu.tr`). Ortamdan erişilemediği için yapısı incelenmedi;
  erişim açılınca bölüm/derslik bazlı programları çeken bir içe aktarıcı `scripts/ingest/` altına eklenecek ve
  mevcut kalite kuralları + insan kontrolü + yayın hattından geçecek. Derslikler katalogdaki bina kimliklerine bağlanır
  (`--building bilisim-fakultesi` vb.), böylece haritada gerçek konumunda görünür.
- Arama motoru üzerinden bulunanlar (27 Ekim 2026, site doğrudan erişilemedi):
  - `dersprogram.sabis.sakarya.edu.tr` dizinde yalnızca ana sayfa olarak var ("Sabis Ders Programları"); bölüm
    programları dizinlenmemiş. Birim programlarının `…/Program/Birim/<birimId>` kalıbında olduğu bölüm duyurularından anlaşılıyor (doğrulanmadı).
  - Derslik kataloğu `mekan.sabis.sakarya.edu.tr/Mekan/Detay/<id>`: dizinde iki kayıt —
    [Mühendislik M3 Blok, Derslik 3203, 2. kat](https://mekan.sabis.sakarya.edu.tr/Mekan/Detay/2442) ve
    [Hukuk Fakültesi, Derslik AMFİ 2](https://mekan.sabis.sakarya.edu.tr/Mekan/Detay/3225).
  - Bazı bölümler programı "Derslikli" Excel olarak da yayımlıyor (ör. `Isletme_..._Ders_Programi_Derslikli.xls`);
    bunlar mevcut XLSX içe aktarıcıyla işlenebilir (`.xls` önce `.xlsx`'e çevrilmeli).
- O zamana kadar: kişisel programlar (`--coverage PARTIAL`) veya kapı çizelgeleri (`--coverage FULL`) CSV ile girilebilir.

## Arama sonuçlarından kullanılan kaynaklar

- [Sakarya Üniversitesi fakülteleri nerede? (SAÜ Haber)](https://haber.sakarya.edu.tr/sakarya-universitesi-fakulteleri-nerede-82755-h82755.html)
- [Kampüs haritası PDF (tanitim.sakarya.edu.tr)](https://tanitim.sakarya.edu.tr/kampusharitasi.pdf) — metin bozuk çıktı, bina numaraları eşleşmedi
- [Kütüphaneler — Aday Öğrenci](https://adayogrenci.sakarya.edu.tr/v2/?lang=en&pg=syf&sayfa=kutuphaneler&id=58)
- [Sessiz çalışma salonu duyurusu](https://kutuphane.sakarya.edu.tr/tr/duyuru/goster/124101/sessiz-calisma-salonu-akademik-personel-ve-lisansustu-ogrencilere-ozel)
- [SAÜ Merkez Kütüphane (SUBÜ protokolü)](https://kutuphane.subu.edu.tr/tr/sakarya-universitesi-merkez-kutuphane-protokol-kapsaminda)
- [Kitap Keyfi açılış haberi (Medyabar)](https://medyabar.com/haber/9823781/kitap-ve-kahve-saude-kitap-keyfi-acildi)
- [Kampüste yeni dönem (Söz Sakarya)](https://sozsakarya.com/haber/28857163/kampuste-yeni-donem-ogrencilere-ozel-alan)
- [SABİS Mekanlar](https://about.sakarya.edu.tr/AltYapiKaynaklar/Mekanlar)
- [İşletme Fakültesi iletişim](https://isletme.sakarya.edu.tr/en/6346/iletisim)
- [Bütçe belgesi 2017 (kampüs konumu)](https://butce.sakarya.edu.tr/sites/butce.sakarya.edu.tr/file/Sakarya_Universitesi_2017_Mali_Yili_Butcesi.pdf)
