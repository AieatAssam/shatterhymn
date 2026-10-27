import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildServiceWorkerSource } from "../src/pwa/swTemplate";

describe("service worker", () => {
  it("precaches files and provides versioned cleanup and navigation fallback", () => {
    const source = buildServiceWorkerSource(["assets/game.js", "audio/bell.mp3"], "1234567890abcdef");
    expect(source).toContain("shatterhymn-1234567890");
    expect(source).toContain("./assets/game.js");
    expect(source).toContain("./audio/bell.mp3");
    expect(source).toContain('startsWith("shatterhymn-")');
    expect(source).toContain("caches.delete(key)");
    expect(source).toContain('event.request.mode === "navigate"');
    expect(source).toContain('caches.match("./index.html")');
  });
  it.each([["icon-192.png", 192], ["icon-512.png", 512], ["icon-maskable-512.png", 512], ["apple-touch-icon.png", 180]])("has a valid PNG header for %s", (name, size) => {
    const data = readFileSync(`public/icons/${name}`);
    expect([...data.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(data.toString("ascii", 12, 16)).toBe("IHDR");
    expect(data.readUInt32BE(16)).toBe(size);
    expect(data.readUInt32BE(20)).toBe(size);
  });
});
