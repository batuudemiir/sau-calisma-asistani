/**
 * Firebase'siz sunum prototipi (örnek veri sunucunun belleğinde). Açıkça NEXT_PUBLIC_DEMO_BACKEND=memory ile ya da
 * Firebase yapılandırması hiç verilmemişse (ör. ortam değişkeni girilmemiş bir Vercel dağıtımı) kendiliğinden açılır;
 * böylece eksik ayar boş sayfa yerine etiketli örnek veriyle çalışan bir uygulama verir.
 * NEXT_PUBLIC_ değerleri derleme anında gömülür: değiştirince yeniden derlemek gerekir.
 */
export const MEMORY_BACKEND =
  process.env.NEXT_PUBLIC_DEMO_BACKEND === "memory" || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
