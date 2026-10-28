import type { Status } from "@/domain/types";
import { STATUS_ICON, STATUS_STYLE, statusDetail, statusTitle } from "@/lib/labels";

export function StatusBadge({ status, isLibrary = false }: { status: Status; isLibrary?: boolean }) {
  const detail = statusDetail(status, isLibrary);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_STYLE[status.code]}`}
      >
        <span aria-hidden="true">{STATUS_ICON[status.code]}</span>
        {statusTitle(status, isLibrary)}
      </span>
      {detail && <span className="text-sm text-fg-2">{detail}</span>}
      {"simulated" in status && status.simulated && <SimulatedBadge />}
    </div>
  );
}

/** Yapay/demo veriyi işaretler. Kesik kenar = "gerçek değil". */
export function SimulatedBadge() {
  return (
    <span className="inline-flex rounded-sm border border-dashed border-simulated-border bg-simulated-bg px-2 py-0.5 text-xs font-semibold text-simulated-fg">
      Örnek demo verisi
    </span>
  );
}
