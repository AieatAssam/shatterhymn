import { msToClock } from "../../core/date";
import type { RunOutcome, RunResult } from "../../meta/runEnd";
import type { SaveV1 } from "../../meta/save";
import { SKINS, SCALE_UNLOCKS, TITLES } from "../../meta/unlocks";
import type { RunStats } from "../../sim/types";
import { button, panel, unmount, type ScreenContext } from "./common";
import { shareText, shareUrl } from "../../meta/share";
import { renderShareCard } from "../../meta/shareCard";
import { missionRows } from "./missions";
const n=(x:number):string=>x.toLocaleString("en-US");
export function resultsModel(outcome: RunOutcome, stats: RunStats, save: SaveV1): {title:string;score:string;best:string;time:string;shards:string;next:string|null;stats:string[]} {const next=outcome.nextUnlock; void save;return {title:"The bell broke.",score:n(stats.score),best:outcome.newBest?"New best!":`Best: ${n(outcome.prevBest)}`,time:`Time ${msToClock(stats.timeMs)}`,shards:`+${n(outcome.shardsEarned)} shards`,next:next?`Next: ${next.name}${next.kind==="skin"?" bell":""} — ${n(next.have)} / ${n(next.need)} shards`:null,stats:[`Most at once ${n(stats.biggestN)}`,`Longest streak ${n(stats.longestStreak)}`,`Crystals broken ${n(stats.crystalsBroken)}`,`Choirs ${n(stats.choirs)}`]};}
export function mount(root: HTMLElement, ctx: ScreenContext, outcome: RunOutcome, stats: RunStats, hymn: number[], mode: "run"|"daily", result: RunResult, dailyNo: number): {unmount:()=>void} {const model=resultsModel(outcome,stats,ctx.save),box=panel(root,model.title);const add=(text:string,cls=""):void=>{const p=document.createElement("p");p.textContent=text;p.className=cls;box.append(p);};add(model.score,"result-score");add(model.best,outcome.newBest?"gold":"");add(model.time);for(const text of model.stats)add(text);add(model.shards,"gold");if(model.next){add(model.next);const progress=document.createElement("progress");progress.max=outcome.nextUnlock!.need;progress.value=outcome.nextUnlock!.have;box.append(progress);}const line=document.createElement("div");line.className="hymn-line";const glyphs=["▲","◆","⬢","★","●"];for(const note of hymn){const span=document.createElement("span");span.textContent=note===20?"💔":note>=10?"✨":glyphs[note%5]??"◆";span.style.color=["#ff4e67","#ffc857","#54dfa0","#5faeff","#c77dff"][note%5]??"#fff";line.append(span);}box.append(line);missionRows(box,ctx);for(const unlock of outcome.unlocked){const item=(unlock.kind==="skin"?SKINS:unlock.kind==="scale"?SCALE_UNLOCKS:TITLES).find(x=>x.id===unlock.id);if(!item)continue;const toast=document.createElement("div");toast.className="unlock-toast";const text=document.createElement("span");text.textContent=`Unlocked: ${item.name}${unlock.kind==="skin"?" bell":""}`;toast.append(text);button(toast,"Use it",()=>ctx.equip(unlock.kind,unlock.id));box.append(toast);}let imageUrl: string | null = null; let file: File | null = null; let mounted = true;
 const shareButton = button(box,"Share",()=>{ void (async () => {
  const text = shareText(result, { dailyNo, url: shareUrl(location.href, result) });
  if (navigator.share) { try { if (file && navigator.canShare?.({files:[file]})) await navigator.share({text,files:[file]}); else await navigator.share({text}); } catch { /* A cancelled share leaves the results screen unchanged. */ } return; }
  try { await navigator.clipboard.writeText(text); } catch { return; }
  if (!mounted) return;
  if (!box.querySelector(".share-feedback")) { const feedback=document.createElement("p"); feedback.className="share-feedback"; feedback.textContent="Copied! Paste it anywhere."; feedback.setAttribute("role","status"); box.append(feedback); }
  if (imageUrl && !box.querySelector(".share-download")) { const link=document.createElement("a"); link.className="share-download"; link.href=imageUrl; link.download="shatterhymn.png"; link.textContent="Save image"; box.append(link); }
 })();});
 shareButton.disabled = true;
 void renderShareCard(result, outcome, ctx.save, dailyNo).then(blob => { if (mounted) { imageUrl = URL.createObjectURL(blob); file = new File([blob], "shatterhymn.png", {type:"image/png"}); } }).catch(() => {}).finally(() => { if (mounted) shareButton.disabled = false; });
 button(box,"Play again",()=>ctx.play(mode),true);button(box,"Menu",()=>ctx.open("title"));return {unmount:()=>{ mounted=false; if(imageUrl) URL.revokeObjectURL(imageUrl); unmount(box); }};}
