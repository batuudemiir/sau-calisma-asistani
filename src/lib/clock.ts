/** Türkiye 2016'dan beri sabit UTC+3 kullanır (yaz saati yok). "2026-10-27T13:00" → epoch ms */
export const istanbulLocalToMs = (local: string) => Date.parse(`${local}:00+03:00`);
