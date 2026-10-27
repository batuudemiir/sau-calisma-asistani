import type { Metadata } from "next";
import { OSM_ATTRIBUTION } from "@/data/campus";

export const metadata: Metadata = { title: "Hakkında" };

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 py-6 lg:max-w-3xl lg:px-8 lg:py-10">
      <h1 className="text-2xl font-bold">Hakkında</h1>
      <p>
        SAÜ Çalışma Asistanı, seçtiğin süre boyunca uygun görünen çalışma alanlarını bilginin kaynağı ve güven etiketiyle
        listeler. GDG on Campus SAÜ Hackathon projesidir; Sakarya Üniversitesi&apos;nin resmî uygulaması değildir.
      </p>

      <section aria-labelledby="kaynaklar" className="space-y-2">
        <h2 id="kaynaklar" className="text-lg font-semibold">
          Bilgi nereden geliyor?
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            Derslik durumları yayımlanmış ders programına dayanır. Programda boş görünen derslik, gerçekten boş olduğu doğrulanmış
            derslik değildir.
          </li>
          <li>&quot;Öğrenci doğruladı&quot; ve &quot;Dolu&quot; etiketleri son 30 dakikadaki öğrenci bildirimlerinden gelir.</li>
          <li>Programı bilinmeyen alanlar &quot;Bilinmiyor&quot; olarak gösterilir, asla &quot;boş&quot; değil.</li>
          <li>&quot;Örnek demo verisi&quot; etiketli bilgiler gösterim amaçlı yapay veridir.</li>
          <li>Bina konumları ve açılış saatleri: {OSM_ATTRIBUTION}.</li>
        </ul>
      </section>

      <section aria-labelledby="gizlilik" className="space-y-2">
        <h2 id="gizlilik" className="text-lg font-semibold">
          Gizlilik
        </h2>
        <p className="text-sm">
          Kayıt ve konum izni gerekmez. Bildirim ve değerlendirmeler anonim bir oturum kimliğiyle kaydedilir; ad, e-posta veya
          konum toplanmaz.
        </p>
      </section>
    </div>
  );
}
