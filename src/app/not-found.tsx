import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-12">
      <h1 className="text-[28px] leading-8 font-bold">Sayfa bulunamadı</h1>
      <Link href="/" className="inline-flex min-h-11 items-center underline">
        Başa dön
      </Link>
    </div>
  );
}
