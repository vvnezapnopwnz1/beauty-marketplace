import { THEMES } from "../theme/themes";
import { contrastRatio } from "./contrast";

describe("WCAG AA contrast", () => {
  for (const th of THEMES) {
    it(`${th.id} text on bg >= 4.5`, () => {
      expect(contrastRatio(th.text, th.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(th.textSoft, th.bg)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("contrast input validation", () => {
  it("throws for invalid foreground", () => {
    expect(() => contrastRatio("not-a-hex", "#FFFFFF")).toThrow("Invalid hex color");
  });

  it("throws for invalid background", () => {
    expect(() => contrastRatio("#000000", "#12")).toThrow("Invalid hex color");
  });
});
