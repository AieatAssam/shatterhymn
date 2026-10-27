import { applyUpdate, onUpdateReady } from "../../pwa/update";
import { dailyNumber, localDateISO } from "../../core/date";
import { playIcon, dailyIcon, missionsIcon, collectionIcon, settingsIcon } from "../icons";
import { button, type ScreenContext } from "./common";

export function titleModel(ctx: Pick<ScreenContext, "save" | "friend">, iso: string) {
  const label = `Daily Hymn #${dailyNumber(iso)}`, day = ctx.save.daily[iso], played = !!day?.plays;
  const badge = played ? day.best.toLocaleString("en-US") : null;
  const done = ctx.save.missions.done.length, missionBadge = `${done} / 3`;
  return { friend: ctx.friend ? `Friend's seed ${ctx.friend}` : null, daily: { label, played, badge, aria: `${label} — ${played ? `Today's best: ${badge}` : "Not played yet"}` }, missions: { label: "Missions", badge: missionBadge, aria: `Missions ${missionBadge}`, complete: done === 3 } };
}
export function mount(root: HTMLElement, ctx: ScreenContext): { unmount: () => void } {
  const model = titleModel(ctx, localDateISO(new Date()));
  const el = document.createElement("section"); el.className = "title-screen";
  const logo = document.createElement("h1"); logo.textContent = "SHATTERHYMN"; logo.dataset.text = "SHATTERHYMN";
  const tagline = document.createElement("p"); tagline.className = "tagline"; tagline.textContent = "Sing one note. Break everything tuned to it."; el.append(logo, tagline);
  if (model.friend) { const friend = document.createElement("p"); friend.className = "friend-pill"; friend.textContent = model.friend; el.append(friend); }
  const menu = document.createElement("div"); menu.className = "title-buttons"; el.append(menu);
  const play = button(menu, "Play", () => ctx.play("run"), true); play.classList.add("play-hero"); play.innerHTML = `${playIcon}<span>Play</span>`;
  const row = document.createElement("div"); row.className = "chip-row"; menu.append(row);
  const chip = (label: string, icon: string, action: () => void, aria = label) => { const b = button(row, label, action); b.className = "chip"; b.setAttribute("aria-label", aria); b.innerHTML = `${icon}<span>${label}</span>`; return b; };
  const daily = chip(model.daily.label, dailyIcon, () => ctx.play("daily"), model.daily.aria); daily.classList.add("daily"); if (!model.daily.played) daily.classList.add("unplayed");
  const dailyBadge = document.createElement("i"); dailyBadge.className = model.daily.played ? "badge done" : "dot"; dailyBadge.textContent = model.daily.badge; daily.append(dailyBadge);
  const missions = chip(model.missions.label, missionsIcon, () => ctx.open("missions"), model.missions.aria); const missionBadge = document.createElement("i"); missionBadge.className = `badge${model.missions.complete ? " done" : ""}`; missionBadge.textContent = model.missions.badge; missions.append(missionBadge);
  chip("Collection", collectionIcon, () => ctx.open("collection")); chip("Settings", settingsIcon, () => ctx.open("settings"));
  const update = document.createElement("button"); update.className = "update-banner"; update.textContent = "Update ready. Tap to refresh."; update.hidden = true; update.addEventListener("click", applyUpdate); el.append(update);
  const unsubscribe = onUpdateReady(ready => { update.hidden = !ready; }); root.append(el); return { unmount: () => { unsubscribe(); el.remove(); } };
}
