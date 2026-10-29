export function parseSlowmo(params: URLSearchParams): number {
  if (params.get("qa") !== "1" || !params.has("slowmo")) return 1;
  const value = Number(params.get("slowmo"));
  return Number.isFinite(value) ? Math.max(1, Math.min(20, value)) : 1;
}
