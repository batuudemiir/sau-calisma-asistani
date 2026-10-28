/** "+N puan" rozeti: lacivert zemin + limon yazı (limon açık zeminde metin olarak kullanılmaz). */
export function PointsEarned({ points }: { points: number }) {
  return (
    <p className="text-sm font-semibold">
      <span className="inline-flex rounded-full bg-ink-900 px-3 py-1 font-mono text-lime-500 dark:bg-lime-500 dark:text-ink-900">
        +{points} puan kazandın
      </span>
    </p>
  );
}
