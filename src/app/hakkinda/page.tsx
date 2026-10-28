import type { Metadata } from "next";
import { MEMORY_BACKEND, SHOW_SAMPLE_LABELS } from "@/lib/backend-mode";
import { Wordmark } from "@/components/brand/Wordmark";
import { OSM_ATTRIBUTION } from "@/data/campus";

export const metadata: Metadata = {
  title: "Hakkında",
  description: "Bilginin kaynakları, gizlilik ve erişilebilirlik.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 py-6 lg:max-w-3xl lg:px-8 lg:py-10">
      <Wordmark size={22} variant="sign" />
      <h1 className="text-[28px] leading-8 font-bold">Hakkında</h1>
      <p>
        neredeçalışalım, seçtiğin süre boyunca uygun görünen çalışma alanlarını bilginin kaynağı ve güven etiketiyle listeler. GDG
        on Campus SAÜ Hackathon projesidir; Sakarya Üniversitesi&apos;nin resmî uygulaması değildir.
      </p>

      <section aria-labelledby="kaynaklar" className="space-y-2">
        <h2 id="kaynaklar" className="text-xl font-bold">
          Bilgi nereden geliyor?
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            Derslik durumları yayımlanmış ders programına dayanır. Programda boş görünen derslik, gerçekten boş olduğu doğrulanmış
            derslik değildir.
          </li>
          <li>&quot;Öğrenci doğruladı&quot; ve &quot;Dolu&quot; etiketleri son 30 dakikadaki öğrenci bildirimlerinden gelir.</li>
          <li>Programı bilinmeyen alanlar &quot;Bilinmiyor&quot; olarak gösterilir, asla &quot;boş&quot; değil.</li>
          {SHOW_SAMPLE_LABELS && <li>&quot;Örnek demo verisi&quot; etiketli bilgiler gösterim amaçlı yapay veridir.</li>}
          <li>Bina konumları ve açılış saatleri: {OSM_ATTRIBUTION}.</li>
          <li>Puanlar yalnızca sana görünür; sonuçların sırasını ve güven etiketlerini etkilemez.</li>
        </ul>
      </section>

      <section aria-labelledby="gizlilik" className="space-y-2 text-sm">
        <h2 id="gizlilik" className="text-xl font-bold">
          Gizlilik ve kişisel veriler (aydınlatma metni taslağı)
        </h2>
        <p>
          Uygulama kayıt olmadan kullanılır. Konum izni istenmez. Haritadaki &quot;Buradayım&quot; bildirimi konumunu değil,
          seçtiğin yeri kaydeder.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Girişsiz:</strong> bildirim, değerlendirme ve puanların cihazına özel anonim bir oturum kimliğiyle saklanır.
            Ad, e-posta veya konum saklanmaz.
          </li>
          <li>
            <strong>SAÜ öğrenci hesabıyla giriş (isteğe bağlı):</strong> amaç, puanlarının cihaz değişse de korunması ve hesabın
            öğrenci hesabı olduğunun doğrulanmasıdır. E-posta adresin kimlik doğrulama hizmetinde (Google Firebase Authentication)
            tutulur; uygulamanın veritabanına yazılmaz ve diğer kullanıcılara gösterilmez.
          </li>
          <li>
            <strong>Saklanan:</strong> oturum kimliği, bildirim türü ve zamanı, değerlendirme puanları, kişisel puan ve katkı
            geçmişi. Bildirimler 30 dakika sonra durum hesabına katılmaz.
          </li>
          <li>
            <strong>Hizmet sağlayıcı:</strong> veriler Google Firebase (Firestore, Authentication) üzerinde işlenir. Harita
            görüntüleri CARTO sunucularından yüklenir (tarayıcın bu sunuculara bağlanır); &quot;Google Haritalar&apos;da yol
            tarifi&quot; bağlantısı Google Haritalar&apos;ı yeni sekmede açar.
            {MEMORY_BACKEND &&
              " Bu sürümde veriler yalnızca sunucuda geçici olarak tutulur."}
          </li>
          <li>
            <strong>Silme hakkı:</strong> Profil → &quot;Hesabımı sil&quot; ile puanların, katkı geçmişin ve hesabın silinir.
            Bildirim ve değerlendirmelerin topluluk verisi olarak kalır, seninle bağı koparılır.
          </li>
        </ul>
        <p className="text-fg-2">
          Bu metin bir hackathon projesi için hazırlanmış taslaktır; hukuki inceleme yapılmamıştır ve KVKK uyumluluğu konusunda
          garanti vermez.
        </p>
      </section>

      <section aria-labelledby="erisilebilirlik" className="space-y-2 text-sm">
        <h2 id="erisilebilirlik" className="text-xl font-bold">
          Erişilebilirlik
        </h2>
        <p>
          Hedef WCAG 2.2 AA düzeyidir. Haritadaki her bilgi, Liste sekmesinde ve harita panelinde metin olarak da bulunur; renk
          tek başına anlam taşımaz. Her sürümde otomatik erişilebilirlik taraması (axe) açık ve koyu temada çalışır. Otomatik
          tarama tüm sorunları bulamaz; ekran okuyucuyla elle test henüz yapılmadı.
        </p>
      </section>
    </div>
  );
}
