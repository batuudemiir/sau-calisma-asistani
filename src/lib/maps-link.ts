/** Google Haritalar'da yürüyerek yol tarifi (resmî Maps URL'si; API anahtarı gerekmez, yeni sekmede açılır). */
export function directionsUrl([lat, lng]: readonly [number, number]): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}&travelmode=walking`;
}
