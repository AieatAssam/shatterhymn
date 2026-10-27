import { describe, expect, it } from "vitest";
import { fitCameraDistance } from "../src/render/camera";
describe("camera fit", () => {
  it("fits the width in portrait and grows as the aspect narrows", () => { const fit = (aspect: number) => fitCameraDistance(30, aspect, 0.94, 0.66, 11); expect(fit(390 / 844)).toBeGreaterThan(fit(0.6)); expect(fit(390 / 844)).toBeCloseTo(11 / (Math.tan(Math.PI / 12) * (390 / 844) * 0.94)); });
  it("fits the height in landscape", () => { expect(fitCameraDistance(30, 16 / 9, 0.94, 0.66, 11)).toBeCloseTo(11 / (Math.tan(Math.PI / 12) * 0.66)); });
  it("grows with radius", () => { expect(fitCameraDistance(30, 1, 0.94, 0.66, 12)).toBeGreaterThan(fitCameraDistance(30, 1, 0.94, 0.66, 11)); });
});
