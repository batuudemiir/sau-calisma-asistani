import Link from "next/link";
import { DURATIONS } from "@/domain/config";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Şimdi nerede çalışabilirsin?</h1>
        <p className="text-base opacity-80">Ne kadar süre çalışacaksın? Kayıt ve konum izni gerekmez.</p>
      </header>

      <nav aria-label="Çalışma süresi" className="grid grid-cols-2 gap-3">
        {DURATIONS.map((d) => (
          <Link
            key={d}
            href={`/results?d=${d}`}
            className="flex min-h-14 items-center justify-center rounded-xl border-2 border-current text-lg font-semibold"
          >
            {d} dakika
          </Link>
        ))}
      </nav>

      <p className="text-sm opacity-70">
        Sonuçlar ders programına ve öğrenci bildirimlerine dayanır. Programda boş görünen derslik, gerçekten boş olduğu
        doğrulanmış derslik değildir.
      </p>
    </main>
  );
}
