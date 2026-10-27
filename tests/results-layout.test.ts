import { describe, expect, it } from "vitest";
import { resultsFooterReservation } from "../src/ui/screens/results";
describe("results footer reservation", () => {
  it("reserves the measured footer and 24 pixels of clearance", () => {
    expect(resultsFooterReservation(144)).toBe(168);
    expect(resultsFooterReservation(0)).toBe(24);
  });
});
