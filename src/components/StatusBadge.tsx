import type { Status } from "@/domain/types";
import { STATUS_ICON, STATUS_STYLE, statusDetail, statusTitle } from "@/lib/labels";

export function StatusBadge({ status, isLibrary = false }: { status: Status; isLibrary?: boolean }) {
  const detail = statusDetail(status, isLibrary);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_STYLE[status.code]}`}>
        <span aria-hidden="true">{STATUS_ICON[status.code]}</span>
        {statusTitle(status, isLibrary)}
      </span>
      {detail && <span className="text-sm opacity-80">{detail}</span>}
      {"simulated" in status && status.simulated && <SimulatedBadge />}
    </div>
  );
}

export function SimulatedBadge() {
  return (
    <span className="inline-flex rounded-md border border-dashed border-amber-700 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-100">
      Örnek demo verisi
    </span>
  );
}
