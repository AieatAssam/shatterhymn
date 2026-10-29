import { expect, it } from "vitest";
import { parseSlowmo } from "../src/game/slowmo";

it("parses QA slow motion and clamps it to 1–20", () => {
  const parse = (query: string) => parseSlowmo(new URLSearchParams(query));
  expect(parse("slowmo=10")).toBe(1);
  expect(parse("qa=1")).toBe(1);
  expect(parse("qa=1&slowmo=0")).toBe(1);
  expect(parse("qa=1&slowmo=2.5")).toBe(2.5);
  expect(parse("qa=1&slowmo=21")).toBe(20);
  expect(parse("qa=1&slowmo=invalid")).toBe(1);
});
