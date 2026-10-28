import { beforeEach, describe, expect, it, vi } from "vitest";

// "server-only" Next dışında içe aktarılınca hata fırlatır; testte etkisiz
vi.mock("server-only", () => ({}));
// Bellek modunda Firebase modülleri hiç yüklenmemeli (Vercel paketinde firebase-admin çözülemiyordu)
const loaded: string[] = [];
vi.mock("../../src/server/firestore-source", () => {
  loaded.push("firestore-source");
  return { sharedSource: () => ({}) };
});
vi.mock("../../src/server/firestore-write-store", () => {
  loaded.push("firestore-write-store");
  return { firestoreWriteStore: () => ({}) };
});
vi.mock("../../src/server/firebase-admin", () => {
  loaded.push("firebase-admin");
  return { adminAuth: () => ({}) };
});

describe("arka uç seçimi", () => {
  beforeEach(() => {
    loaded.length = 0;
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("Firebase yapılandırması yoksa bellek arka ucu; Firebase modülleri yüklenmez", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_BACKEND", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "");
    const b = await import("../../src/server/backend");
    expect(b.isMemoryBackend()).toBe(true);
    const source = await b.dataSource();
    expect((await source.spaces()).length).toBeGreaterThan(0);
    await b.writeStore();
    expect(loaded).toEqual([]);
  });

  it("Firebase yapılandırması varsa Firestore modülleri ilk kullanımda yüklenir", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_BACKEND", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "ornek-proje");
    const b = await import("../../src/server/backend");
    expect(b.isMemoryBackend()).toBe(false);
    expect(loaded).toEqual([]);
    await b.dataSource();
    await b.writeStore();
    expect(loaded).toEqual(["firestore-source", "firestore-write-store"]);
  });
});
