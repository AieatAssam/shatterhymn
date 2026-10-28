import { describe, expect, it } from "vitest";
import { padVisible, type PadState } from "../src/ui/colorPad";

describe("colour pad visibility", () => {
  it("shows only during playable runs and tutorial strike steps", () => {
    for (const state of ["title", "paused", "over"] as PadState[]) expect(padVisible(state, true)).toBe(false);
    expect(padVisible("run")).toBe(true);
    expect(padVisible("daily")).toBe(true);
    expect(padVisible("tutorial", false)).toBe(false);
    expect(padVisible("tutorial", true)).toBe(true);
  });
});
