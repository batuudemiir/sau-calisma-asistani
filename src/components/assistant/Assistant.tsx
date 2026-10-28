"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  CRITERION_LABELS,
  distanceM,
  recommend,
  type KindPreference,
  type LatLng,
  type Recommendation,
} from "@/domain/assistant";
import { DURATIONS } from "@/domain/config";
import { POINTS, DAILY_CAP } from "@/domain/points";
import { CRITERIA, type Criterion } from "@/domain/ratings";
import { CAMPUS_CENTER, CAMPUS_RADIUS_M, candidatesFrom } from "@/lib/assistant-candidates";
import { statusTitle } from "@/lib/labels";
import type { MapResponse } from "@/server/search-service";
import type { MapSelection } from "../map/CampusMap";
import { buttonClass } from "../ui/Button";

type Step = "menu" | "duration" | "needs" | "kind" | "location" | "results";
type Line = { from: "bot" | "me"; text: string };

const KIND_OPTIONS: { value: KindPreference; label: string }[] = [
  { value: "ANY", label: "Fark etmez" },
  { value: "CLASSROOM", label: "Boş derslik" },
  { value: "LIBRARY", label: "Kütüphane" },
  { value: "STUDY_AREA", label: "Kafe / çalışma alanı" },
];

/** Sabit yanıtlar: asistan bilgi verir, hiçbir şeyi uydurmaz. */
const FAQ: { q: string; a: string }[] = [
  {
    q: "Etiketler ne anlama geliyor?",
    a: '"Öğrenci doğruladı": son 30 dakikada biri orada olduğunu ve uygun olduğunu bildirdi. "Programda boş": ders programına göre boş, ama gerçekten boş olduğu doğrulanmadı. "Bilinmiyor": programı yok veya eksik; boş saymıyoruz.',
  },
  {
    q: "QR ile check-in nedir?",
    a: "Dersliklerin kapısındaki QR kodu telefonunun kamerasıyla okut. Açılan sayfada check-in yaparsan orada olduğun doğrulanır, normal check-in'den daha fazla puan alırsın ve ardından yeri değerlendirebilirsin.",
  },
  {
    q: "Puan ve ödüller nasıl çalışıyor?",
    a: `Check-in +${POINTS.CHECKIN} (QR ile +${POINTS.QR_CHECKIN}), bildirim +${POINTS.REPORT}, değerlendirme +${POINTS.RATING}; günde en fazla ${DAILY_CAP} puan. Ay içinde ödül eşiğine ulaşırsan SAÜ öğrenci hesabınla Profil'den ödül alabilirsin (stokla sınırlı). Puanlar sonuçların sırasını etkilemez.`,
  },
];

export function Assistant({
  data,
  duration,
  onDuration,
  onSelect,
  query,
  buttonHidden = false,
}: {
  /** Telefonda alt panel büyükken düğme panelin altında kalmasın diye gizlenir. */
  buttonHidden?: boolean;
  data: MapResponse | null;
  duration: number;
  onDuration: (d: number) => void;
  onSelect: (sel: MapSelection, el: Element) => void;
  query: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("menu");
  const [lines, setLines] = useState<Line[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [kind, setKind] = useState<KindPreference>("ANY");
  const [here, setHere] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const fab = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    title.current?.focus();
    // Seçilen düğme kaybolunca odak sayfaya düşebilir; Esc panel dışından da çalışsın
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setTimeout(() => fab.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [lines, step]);

  const say = (...add: Line[]) => setLines((l) => [...l, ...add]);
  const close = () => {
    setOpen(false);
    setTimeout(() => fab.current?.focus(), 0);
  };
  const restart = () => {
    setLines([]);
    setCriteria([]);
    setKind("ANY");
    setStep("menu");
  };

  function askLocation(use: boolean) {
    if (!use) {
      say({ from: "me", text: "Konum kullanma" }, { from: "bot", text: "Tamam, mesafeyi hesaba katmadan öneriyorum." });
      setHere(null);
      setStep("results");
      return;
    }
    say({ from: "me", text: "Konumumu kullan" });
    if (!("geolocation" in navigator)) {
      say({ from: "bot", text: "Tarayıcın konum paylaşmayı desteklemiyor; mesafesiz öneriyorum." });
      setStep("results");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p: LatLng = [pos.coords.latitude, pos.coords.longitude];
        if (distanceM(p, CAMPUS_CENTER) > CAMPUS_RADIUS_M) {
          say({ from: "bot", text: "Kampüsün dışında görünüyorsun; mesafeyi hesaba katmıyorum." });
          setHere(null);
        } else {
          say({
            from: "bot",
            text: "Konumunu aldım (yalnızca bu cihazda kullanılıyor, kaydedilmiyor). Yakındakileri öne alıyorum.",
          });
          setHere(p);
        }
        setStep("results");
      },
      () => {
        setLocating(false);
        say({ from: "bot", text: "Konum alınamadı (izin verilmedi veya zaman aşımı); mesafesiz öneriyorum." });
        setHere(null);
        setStep("results");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const ready = data && data.durationMin === duration;
  const recs: Recommendation[] = step === "results" && ready ? recommend(candidatesFrom(data), { criteria, kind, here }) : [];

  const option = "min-h-11 rounded-full border border-line-strong bg-card px-3.5 text-sm font-semibold hover:bg-sunken";
  return (
    <>
      <button
        ref={fab}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-label="Asistan"
        className={`absolute right-3 bottom-[17rem] z-20 flex size-14 items-center justify-center rounded-full border-2 border-cobalt-500 bg-cobalt-500 text-lime-500 shadow-control hover:bg-cobalt-600 active:translate-y-px lg:bottom-4 ${buttonHidden && !open ? "max-lg:hidden" : ""}`}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.4A8 8 0 1 1 21 12z" />
          <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
        </svg>
      </button>

      {open && (
        <section
          id={`${id}-panel`}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${id}-title`}
          className="absolute inset-x-2 bottom-2 z-30 flex max-h-[80%] flex-col rounded-xl border border-line bg-background shadow-xl lg:inset-x-auto lg:right-4 lg:bottom-20 lg:w-[26rem]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line p-3">
            <h2 id={`${id}-title`} ref={title} tabIndex={-1} className="font-bold outline-none">
              Çalışma asistanı
            </h2>
            <div className="flex gap-2">
              {step !== "menu" && (
                <button type="button" onClick={restart} className={buttonClass("secondary", "md")}>
                  Baştan
                </button>
              )}
              <button type="button" onClick={close} className={buttonClass("secondary", "md")}>
                Kapat
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            <p className="text-sm">
              Merhaba! Sana uygun çalışma yerini birkaç soruyla bulabilirim. Önerilerim kural tabanlıdır; bilmediğim şeyi
              bilmiyorum diye söylerim.
            </p>
            <ol aria-live="polite" className="space-y-2 text-sm">
              {lines.map((l, i) => (
                <li
                  key={i}
                  className={
                    l.from === "me"
                      ? "ml-8 rounded-lg bg-zinc-100 p-2 text-right dark:bg-zinc-800"
                      : "mr-8 rounded-lg border border-line bg-card p-2"
                  }
                >
                  <span className="sr-only">{l.from === "me" ? "Sen: " : "Asistan: "}</span>
                  {l.text}
                </li>
              ))}
            </ol>

            {step === "menu" && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`${option} border-current`}
                  onClick={() => {
                    say({ from: "me", text: "Çalışacak yer bul" }, { from: "bot", text: "Kaç dakika çalışacaksın?" });
                    setStep("duration");
                  }}
                >
                  Çalışacak yer bul
                </button>
                {FAQ.map((f) => (
                  <button
                    key={f.q}
                    type="button"
                    className={option}
                    onClick={() => say({ from: "me", text: f.q }, { from: "bot", text: f.a })}
                  >
                    {f.q}
                  </button>
                ))}
              </div>
            )}

            {step === "duration" && (
              <div role="group" aria-label="Süre" className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={option}
                    onClick={() => {
                      onDuration(d);
                      say(
                        { from: "me", text: `${d} dakika` },
                        { from: "bot", text: "Neye ihtiyacın var? Birden fazla seçebilirsin." },
                      );
                      setStep("needs");
                    }}
                  >
                    {d} dakika
                  </button>
                ))}
              </div>
            )}

            {step === "needs" && (
              <div className="space-y-2">
                <div role="group" aria-label="İhtiyaçlar" className="flex flex-wrap gap-2">
                  {CRITERIA.map((k) => {
                    const on = criteria.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={on}
                        className={`${option} ${on ? "bg-ink-900 text-lime-500 border-ink-900 dark:bg-lime-500 dark:text-ink-900 dark:border-lime-500" : ""}`}
                        onClick={() => setCriteria((c) => (on ? c.filter((x) => x !== k) : [...c, k]))}
                      >
                        {on && <span aria-hidden="true">✓ </span>}
                        {k === "quiet" ? "Sessiz" : k === "power" ? "Priz" : k === "wifi" ? "İnternet" : "Işık"}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className={`${option} border-current`}
                  onClick={() => {
                    say(
                      { from: "me", text: criteria.length ? criteria.map((k) => CRITERION_LABELS[k]).join(", ") : "Fark etmez" },
                      { from: "bot", text: "Nerede çalışmak istersin?" },
                    );
                    setStep("kind");
                  }}
                >
                  {criteria.length ? "Devam" : "Fark etmez, devam"}
                </button>
              </div>
            )}

            {step === "kind" && (
              <div role="group" aria-label="Yer türü" className="flex flex-wrap gap-2">
                {KIND_OPTIONS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    className={option}
                    onClick={() => {
                      setKind(k.value);
                      say(
                        { from: "me", text: k.label },
                        {
                          from: "bot",
                          text: "Yakınındaki yerleri öne almamı ister misin? Konumun yalnızca bu cihazda kullanılır, sunucuya gönderilmez.",
                        },
                      );
                      setStep("location");
                    }}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            )}

            {step === "location" && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`${option} border-current`}
                  disabled={locating}
                  onClick={() => askLocation(true)}
                >
                  {locating ? "Konum alınıyor…" : "Konumumu kullan"}
                </button>
                <button type="button" className={option} disabled={locating} onClick={() => askLocation(false)}>
                  Hayır, konumsuz öner
                </button>
              </div>
            )}

            {step === "results" && !ready && <p role="status">Öneriler hesaplanıyor…</p>}
            {step === "results" && ready && (
              <section aria-label="Öneriler" className="space-y-3">
                {recs.length === 0 ? (
                  <p className="text-sm">
                    Bu tercihlerle uygun görünen yer bulamadım. Türü &quot;Fark etmez&quot; yapmayı veya daha kısa bir süre
                    denemeyi öneririm.
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {recs.map((r, i) => (
                      <li key={r.candidate.id} className="space-y-1 rounded-lg border border-line bg-card p-3">
                        <p className="font-bold">
                          {i + 1}. {r.candidate.name}
                          {r.candidate.context && <span className="font-normal text-fg-2"> · {r.candidate.context}</span>}
                        </p>
                        <p className="text-sm">{statusTitle(r.candidate.status, r.candidate.kind !== "CLASSROOM")}</p>
                        <ul className="text-sm">
                          {r.reasons.map((x) => (
                            <li key={x}>
                              <span aria-hidden="true">✓ </span>
                              {x}
                            </li>
                          ))}
                          {r.cautions.map((x) => (
                            <li key={x} className="text-fg-2">
                              <span aria-hidden="true">! </span>
                              <span className="sr-only">Dikkat: </span>
                              {x}
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {r.candidate.kind === "CLASSROOM" ? (
                            <Link
                              href={`/yer/${encodeURIComponent(r.candidate.id)}?${query}`}
                              className={`${option} inline-flex items-center`}
                            >
                              Ayrıntı ve check-in
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className={option}
                              onClick={(e) => {
                                onSelect({ s: r.candidate.id }, e.currentTarget);
                                setOpen(false);
                              }}
                            >
                              Haritada göster
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="text-xs text-fg-3">
                  Oraya gidince &quot;Buradayım&quot; de veya kapıdaki QR kodu okut; diğer öğrencilere yardımcı olur, puan
                  kazanırsın.
                </p>
              </section>
            )}
            <div ref={end} />
          </div>
        </section>
      )}
    </>
  );
}
