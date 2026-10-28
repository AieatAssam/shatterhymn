# AGENTS.md — rules for the implementer (Codex)

You are building **Shatterhymn**, a one-thumb web game. The design is finished. Your job is to implement it exactly.

## Read first, every session
1. `docs/MODES.md`: the two-mode recovery spec (Tap and Slice). **It wins over every other doc** on rules, numbers, strings, look and code structure.
2. `docs/milestones.md`: do only the milestones you were given, in order (recovery milestones are R1 to R4).
3. `docs/design.md` (rules, numbers, player-facing text), `docs/art/style-guide.md` (look, motion, haptics, audio feel), `docs/architecture.md` (modules, APIs, save schema, build/deploy; §20 "Two modes"). `docs/TAP-DESIGN.md` and `docs/ART-HAPTICS-SPEC.md` are superseded wherever MODES.md differs.
If they conflict: MODES.md wins; after that design.md wins for rules, style-guide.md for look/feel numbers, architecture.md for code structure. Report any conflict under "spec-notes".

## Hard rules
- **No background commands.** No `&`, no watchers, no dev servers, no `vite` / `vite preview`, no `vitest` watch mode. Wrap every command in `timeout 300` (`npm install` may use `timeout 540`).
- **No browser.** Don't open browsers or run Playwright, Puppeteer or jsdom.
- **No git commits or pushes.** The lead commits.
- **Follow the docs literally.** Use the exact numbers, file names, APIs and strings. Don't invent features, screens, currencies or text. Don't write "TODO" or "TBD" in shipped code.
- **No flat placeholder art.** Every visual uses the style-guide shaders and palette. If a feature belongs to a later milestone, leave it out instead of faking it.
- **Plain text for players.** Every player-facing string is plain, concrete English, copied from `docs/MODES.md` (or design.md where MODES.md has no string). Never cryptic.
- **The sim stays pure:** `src/sim` never uses `window`, `document`, `Date`, `performance` or `Math.random`.
- **No network calls** beyond loading the game's own static files. No analytics, no external fonts or CDNs (fonts come from `@fontsource`).
- **Don't modify** `public/audio/*` or the docs (propose doc changes in your final message instead).
- **Keep `scripts/layout-check.mjs` working.** Every screen the lead tests must stay reachable through the selectors the script uses (`.title-screen`, `.play-hero`, `.daily`, `.missions-chip`, `button[aria-label="Settings"]`, `button[aria-label="Collection"]`, `.pause-button`, `Credits`, `How to play`, `Play again`). If you add or change a screen or selector, keep the old selector working or document the new one in `docs/MODES.md` "QA hooks" in your proposed spec changes, and extend the script's `openScreen` for it. QA-only code runs only with `?qa=1`.
- **`timeout 300 npm run check` must pass** before you finish (lint + typecheck + tests + build). If `check` doesn't exist yet (M0), create it first.

## Final message format
For each milestone: what you built (files), each done-when item and how you verified it, test count, spec-notes (conflicts or ambiguities and what you chose), proposed spec changes.
