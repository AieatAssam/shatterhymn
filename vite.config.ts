import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import { buildServiceWorkerSource } from "./src/pwa/swTemplate";
function publicFiles(dir: string, prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const name = prefix + entry.name;
    return entry.isDirectory() ? publicFiles(join(dir, entry.name), `${name}/`) : [name];
  });
}
function swPrecache(): Plugin {
  return {
    name: "sw-precache",
    generateBundle(_, bundle) {
      const files = [...new Set([...Object.keys(bundle), ...publicFiles("public")])].filter(name => name !== "sw.js").sort();
      const hash = createHash("sha1").update(files.join("\n"));
      for (const name of Object.keys(bundle).sort()) {
        const item = bundle[name]!;
        hash.update(String(item.type === "chunk" ? Buffer.byteLength(item.code) : typeof item.source === "string" ? Buffer.byteLength(item.source) : item.source.byteLength));
      }
      this.emitFile({ type: "asset", fileName: "sw.js", source: buildServiceWorkerSource(files, hash.digest("hex")) });
    },
  };
}
export default defineConfig({
  base: "./",
  build: { target: "es2022", assetsInlineLimit: 0 },
  plugins: [swPrecache()],
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
