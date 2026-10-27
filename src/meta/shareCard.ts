import { msToClock, dailyNumber, localDateISO } from "../core/date";
import { seedToHex } from "../core/rng";
import { glyphShape } from "../render/glyphs";
import type { RunOutcome, RunResult } from "./runEnd";
import type { SaveV1 } from "./save";
import { SKINS, TITLES } from "./unlocks";
import { shareUrl } from "./share";

const COLORS = ["#FF4F6E", "#FFC23F", "#3FE0A0", "#4FA8FF", "#C77DFF"];
const FRAMES: Record<string, string> = { clear: "#C9D6F2", quartz: "#B49A80", rosegold: "#E8A090", obsidian: "#5A4FA0", rosewindow: "#FFD27A", crown: "#FFD27A" };
const WIDTH = 1080, HEIGHT = 1350;
export async function renderShareCard(r: RunResult, outcome: RunOutcome, save: SaveV1, dailyNo = dailyNumber(localDateISO(new Date())), base = location.href): Promise<Blob> {
 await document.fonts.ready;
 const canvas = document.createElement("canvas"); canvas.width = WIDTH; canvas.height = HEIGHT;
 const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas unavailable");
 const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT); bg.addColorStop(0, "#151033"); bg.addColorStop(1, "#05040C"); ctx.fillStyle = bg; ctx.fillRect(0, 0, WIDTH, HEIGHT);
 for (let i = 0; i < 5; i++) { const x = 90 + i * 230; const ray = ctx.createLinearGradient(x, 0, x + 200, 0); ray.addColorStop(0, "rgba(185,198,255,0)"); ray.addColorStop(.5, "rgba(185,198,255,0.09)"); ray.addColorStop(1, "rgba(185,198,255,0)"); ctx.fillStyle = ray; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 130, 0); ctx.lineTo(x - 80, 900); ctx.lineTo(x - 250, 900); ctx.closePath(); ctx.fill(); }
 ctx.strokeStyle = "rgba(159,216,255,0.15)"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(540, 300); ctx.bezierCurveTo(380, 300, 360, 500, 345, 585); ctx.bezierCurveTo(330, 670, 295, 720, 270, 750); ctx.quadraticCurveTo(540, 820, 810, 750); ctx.bezierCurveTo(785, 720, 750, 670, 735, 585); ctx.bezierCurveTo(720, 500, 700, 300, 540, 300); ctx.stroke();
 let frame: string | CanvasGradient = FRAMES[save.equipped.skin] ?? "#C9D6F2"; if (save.equipped.skin === "aurora") { frame = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT); frame.addColorStop(0, COLORS[2]!); frame.addColorStop(.5, COLORS[3]!); frame.addColorStop(1, COLORS[4]!); }
 ctx.strokeStyle = frame; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(20, 20, 1040, 1310, 40); ctx.stroke();
 if (save.equipped.skin === "crown") for (let i=0;i<5;i++) { ctx.fillStyle = COLORS[i]!; ctx.beginPath(); ctx.arc(480+i*30, 24, 7, 0, Math.PI*2); ctx.fill(); }
 ctx.textAlign = "center"; ctx.textBaseline = "middle";
 const logo = ctx.createLinearGradient(0, 50, 0, 120); logo.addColorStop(0, "#FFFFFF"); logo.addColorStop(1, "#BFD9FF"); ctx.fillStyle = logo; ctx.font = "700 64px Cinzel"; ctx.letterSpacing = "0.12em"; ctx.fillText("SHATTERHYMN", 540, 90); ctx.letterSpacing = "0px";
 ctx.fillStyle = "#A59FC9"; ctx.font = "600 30px Inter"; ctx.fillText(r.mode === "daily" ? `Daily Hymn #${dailyNo}` : `Run · Seed ${seedToHex(r.seed)}`, 540, 150);
 const score = r.stats.score.toLocaleString("en-US"); let size = 180; ctx.font = `800 ${size}px Inter`; while (ctx.measureText(score).width > 900 && size > 1) { size--; ctx.font = `800 ${size}px Inter`; } ctx.fillStyle = "#F4F1FF"; ctx.shadowColor = "#9FD8FF"; ctx.shadowBlur = 32; ctx.fillText(score, 540, 420); ctx.shadowBlur = 0;
 if (outcome.newBest) { ctx.fillStyle = "#FFD27A"; ctx.beginPath(); ctx.roundRect(435, 510, 210, 52, 26); ctx.fill(); ctx.fillStyle = "#1A1030"; ctx.font = "700 24px Inter"; ctx.fillText("NEW BEST", 540, 536); }
 const symbols = r.hymn.length > 30 ? [...r.hymn.slice(0, 12), ...r.hymn.slice(-18)] : r.hymn;
 symbols.forEach((note, i) => { const x = 176 + (i % 15) * 52, y = 645 + Math.floor(i / 15) * 100; if (note === 10 || note === 20) { ctx.fillStyle = note === 10 ? "#FFD27A" : "#FF3B5C"; ctx.font = "700 42px Inter"; ctx.fillText(note === 10 ? "★" : "ϟ", x, y); return; } if (note < 0 || note > 4) return; const points = glyphShape(note).getPoints(); ctx.save(); ctx.translate(x, y); ctx.beginPath(); points.forEach((p, index) => { if (index === 0) ctx.moveTo(p.x*23, -p.y*23); else ctx.lineTo(p.x*23, -p.y*23); }); ctx.closePath(); const gem = ctx.createRadialGradient(-5, -7, 1, 0, 0, 28); gem.addColorStop(0, "#FFFFFF"); gem.addColorStop(.25, COLORS[note]!); gem.addColorStop(1, "#151033"); ctx.fillStyle = gem; ctx.shadowColor = COLORS[note]!; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = COLORS[note]!; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); });
 const labels = ["MOST AT ONCE", "STREAK", "TIME"], values = [String(r.stats.biggestN), String(r.stats.longestStreak), msToClock(r.stats.timeMs)]; for (let i=0;i<3;i++) { const x=190+i*350; ctx.fillStyle="#A59FC9"; ctx.font="600 24px Inter"; ctx.fillText(labels[i]!,x,880); ctx.fillStyle="#F4F1FF"; ctx.font="800 64px Inter"; ctx.fillText(values[i]!,x,945,320); }
 const title = TITLES.find(item => item.id === save.equipped.title)?.name ?? "Novice Bell"; const skin = SKINS.find(item => item.id === save.equipped.skin)?.name ?? "Clear Glass"; ctx.fillStyle="#F4F1FF"; ctx.font="600 30px Inter"; ctx.fillText(`${title} · ${skin} bell`,540,1180,940); if(r.slowDial) { ctx.fillStyle="#FFD27A"; ctx.font="600 26px Inter"; ctx.fillText("Slower crystals",540,1230); } ctx.fillStyle="#A59FC9"; ctx.font="600 24px Inter"; ctx.fillText(shareUrl(base,r),540,1280,940);
 return new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png"));
}
