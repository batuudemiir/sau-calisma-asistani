// Harita düğmeleri: 44×44, beyaz kart, Lucide plus / minus / locate / maximize-2.
const ICONS = {
  in: "M5 12h14 M12 5v14",
  out: "M5 12h14",
  center: "M2 12h3 M19 12h3 M12 2v3 M12 19v3 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
  all: "M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7",
};

export function MapControls({
  onZoomIn,
  onZoomOut,
  onCenter,
  onAll,
  hidden = false,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  onAll: () => void;
  /** Telefonda alt panel büyükken panelin altında kalmasın diye gizlenir. */
  hidden?: boolean;
}) {
  const buttons = [
    { label: "Yakınlaştır", icon: ICONS.in, on: onZoomIn },
    { label: "Uzaklaştır", icon: ICONS.out, on: onZoomOut },
    { label: "Merkeze dön", icon: ICONS.center, on: onCenter },
    { label: "Tüm kampüsü göster", icon: ICONS.all, on: onAll },
  ];
  return (
    <div
      className={`absolute right-2 bottom-[21.5rem] z-10 flex flex-col gap-2 lg:bottom-20 lg:flex ${hidden ? "max-lg:hidden" : ""}`}
      role="group"
      aria-label="Harita denetimleri"
    >
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={b.on}
          aria-label={b.label}
          className="flex size-11 items-center justify-center rounded-md border border-line-strong bg-card text-fg-1 shadow-control transition-colors duration-[var(--dur-fast)] hover:bg-sunken active:translate-y-px"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={b.icon} />
          </svg>
        </button>
      ))}
    </div>
  );
}
