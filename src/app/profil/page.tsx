import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6 lg:max-w-3xl lg:px-8 lg:py-10">
      <h1 className="text-2xl font-bold">Profil</h1>
      <section aria-labelledby="hesap" className="space-y-2 rounded-xl border border-zinc-300 p-4 dark:border-zinc-700">
        <h2 id="hesap" className="text-lg font-semibold">
          Katkıların bu cihazda anonim
        </h2>
        <p className="text-sm opacity-80">
          Check-in ve değerlendirmelerin giriş yapmadan da çalışır. SAÜ öğrenci hesabıyla giriş ve kişisel puanlar yakında
          eklenecek.
        </p>
      </section>
      <Link href="/hakkinda" className="inline-flex min-h-11 items-center underline">
        Hakkında, veri kaynakları ve gizlilik
      </Link>
    </div>
  );
}
