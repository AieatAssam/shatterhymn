import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function chunk(type, data) {
  const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  let c = 0xffffffff;
  for (const b of Buffer.concat([name, data])) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  crc.writeUInt32BE((c ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, name, data, crc]);
}
function polygonDistance(x, y, points) {
  let inside = false, d = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[j], [bx, by] = points[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside ? -d : d;
}
const regular = (n, radius, rotation = -Math.PI / 2) => Array.from({ length: n }, (_, i) => [Math.cos(rotation + i * 2 * Math.PI / n) * radius, Math.sin(rotation + i * 2 * Math.PI / n) * radius]);
const triangle = regular(3, .105);
const hexagon = regular(6, .088);
const star = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .042 : .1; return [Math.cos(a) * r, Math.sin(a) * r]; });
const bell = [[-.175,-.12],[.175,-.12],[.20,.12],[.255,.23],[-.255,.23],[-.20,.12]];
function render(size, scale, filename) {
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const x = ((px + .5) / size - .5) / scale, y = ((py + .5) / size - .5) / scale;
    const color = [8, 6, 20];
    const add = (rgb, amount) => { for (let k = 0; k < 3; k++) color[k] += rgb[k] * amount; };
    const fog = Math.exp(-Math.hypot(x * 1.1, y) * 5); add([28, 31, 75], fog * .45);
    const d = Math.min(Math.hypot(x, y + .12) - .175, polygonDistance(x, y, bell));
    add([65, 150, 255], Math.exp(-Math.max(0, d) * 23) * .22);
    if (d < 0) {
      const rim = Math.exp(d * 55), streak = Math.exp(-(((x + .075) / .035) ** 2)) * Math.exp(-(((y + .07) / .23) ** 2));
      add([130, 185, 235], .19 + rim * .55 + streak * .35);
      add([100, 160, 255], Math.exp(-(x * x + (y - .16) ** 2) / .02) * .35);
    }
    const lip = Math.abs(Math.hypot(x / .245, (y - .225) / .035) - 1);
    add([159, 216, 255], Math.exp(-lip * 8) * .46);
    const clapper = Math.hypot(x, y - .25) - .037;
    add([190, 224, 255], Math.exp(-Math.abs(clapper) * 70) * .35 + (clapper < 0 ? .25 : 0));
    for (const [gx, gy, shape, base] of [[-.30,-.25,triangle,[255,79,110]],[.31,-.18,star,[79,168,255]],[.30,.29,hexagon,[63,224,160]]]) {
      const gd = polygonDistance(x-gx, y-gy, shape);
      add(base, Math.exp(-Math.max(0,gd)*35)*.28);
      if (gd < 0) { const edge = Math.exp(gd * 65); add(base, .48 + edge * .45); add([255,255,255], Math.exp(-Math.hypot(x-gx+.018,y-gy+.025)*35)*.6); }
    }
    // Small facets radiate outward from the three breaking glyphs.
    for (const [sx, sy, radius, rgb] of [[-.40,-.34,.018,[255,79,110]],[-.20,-.34,.012,[255,179,192]],[.41,-.29,.017,[79,168,255]],[.42,-.08,.012,[194,226,255]],[.42,.38,.018,[63,224,160]],[.20,.40,.013,[184,255,226]]]) {
      const shard = polygonDistance(x - sx, y - sy, regular(3, radius));
      add(rgb, Math.exp(-Math.max(0, shard) * 70) * .2 + (shard < 0 ? .55 : 0));
    }
    const offset = py * (size * 4 + 1) + 1 + px * 4;
    for (let k = 0; k < 3; k++) rows[offset + k] = Math.min(255, Math.round(color[k]));
    rows[offset + 3] = 255;
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size,0); ihdr.writeUInt32BE(size,4); ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(`public/icons/${filename}`, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ihdr),chunk("IDAT",deflateSync(rows)),chunk("IEND",Buffer.alloc(0))]));
}
mkdirSync("public/icons", { recursive: true });
render(192, 1, "icon-192.png"); render(512, 1, "icon-512.png"); render(512, .8, "icon-maskable-512.png"); render(180, 1, "apple-touch-icon.png");
