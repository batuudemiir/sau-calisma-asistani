/**
 * Firebase'siz sunum prototipi (örnek veri sunucunun belleğinde). Açıkça NEXT_PUBLIC_DEMO_BACKEND=memory ile ya da
 * Firebase yapılandırması hiç verilmemişse (ör. ortam değişkeni girilmemiş bir Vercel dağıtımı) kendiliğinden açılır;
 * böylece eksik ayar boş sayfa yerine etiketli örnek veriyle çalışan bir uygulama verir.
 * NEXT_PUBLIC_ değerleri derleme anında gömülür: değiştirince yeniden derlemek gerekir.
 */
export const MEMORY_BACKEND =
  process.env.NEXT_PUBLIC_DEMO_BACKEND === "memory" || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

/**
 * Örnek kayıtların arayüzde "Örnek demo verisi" diye etiketlenmesi. Sunum prototipinde (bellek modu) ekip kararıyla
 * kapalı (CLAUDE.md kural 6); kayıtlar içte yine isSimulated=true taşır. Firebase modunda her zaman açık.
 */
export const SHOW_SAMPLE_LABELS = !MEMORY_BACKEND;
