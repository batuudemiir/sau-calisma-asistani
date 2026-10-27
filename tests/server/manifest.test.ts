import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../../src/app/manifest";

describe("web uygulama manifesti", () => {
  it("Türkçe ad, standalone, her simge dosyası public/ altında var", () => {
    const m = manifest();
    expect(m).toMatchObject({ lang: "tr", display: "standalone", start_url: "/" });
    for (const icon of m.icons ?? []) expect(existsSync(join(__dirname, "../../public", icon.src))).toBe(true);
    expect(m.icons?.some((i) => i.sizes === "512x512")).toBe(true);
  });
});
