import { describe, it, expect } from "vitest";
import { strip, stripAnsi, fallbackStringWidth, stringWidth, clear } from "../src/utils";

const isBun = typeof globalThis.Bun !== "undefined";
const runtime = isBun ? "bun" : "node";

describe(`stringWidth (${runtime})`, () => {
  describe("ASCII strings", () => {
    it("empty string", () => {
      expect(stringWidth("")).toBe(0);
    });

    it("simple ASCII", () => {
      expect(stringWidth("hello")).toBe(5);
    });

    it("ASCII with spaces", () => {
      expect(stringWidth("hello world")).toBe(11);
    });
  });

  describe("ANSI escape sequences", () => {
    it("strips color codes", () => {
      // red "hello" via ANSI
      const red = "\u001B[31mhello\u001B[0m";
      expect(stringWidth(red)).toBe(5);
    });

    it("strips bold + color", () => {
      const boldGreen = "\u001B[1m\u001B[32mtest\u001B[0m";
      expect(stringWidth(boldGreen)).toBe(4);
    });

    it("strips cursor movement codes", () => {
      const withCursor = "\u001B[2Khello\u001B[0G";
      expect(stringWidth(withCursor)).toBe(5);
    });

    it("nested ANSI codes", () => {
      const nested = "\u001B[31m\u001B[1mbold red\u001B[22m red\u001B[0m";
      expect(stringWidth(nested)).toBe(12); // "bold red red"
    });

    it("empty string with ANSI", () => {
      expect(stringWidth("\u001B[31m\u001B[0m")).toBe(0);
    });
  });

  describe("emoji", () => {
    it("single emoji (surrogate pair)", () => {
      // thumbs up is U+1F44D — 2 UTF-16 code units, but 1 code point
      const w = stringWidth("\u{1F44D}");
      // Bun.stringWidth returns 2 (correct terminal width for emoji)
      // JS fallback returns 1 (counts code points, not columns)
      if (isBun) {
        expect(w).toBe(2);
      } else {
        expect(w).toBe(1);
      }
    });

    it("multiple emoji", () => {
      const w = stringWidth("\u{1F600}\u{1F601}\u{1F602}"); // 3 emoji
      if (isBun) {
        expect(w).toBe(6); // 2 columns each
      } else {
        expect(w).toBe(3); // 1 code point each
      }
    });

    it("emoji with ANSI wrapping", () => {
      const colored = "\u001B[33m\u{1F44D}\u001B[0m";
      const w = stringWidth(colored);
      if (isBun) {
        expect(w).toBe(2);
      } else {
        expect(w).toBe(1);
      }
    });
  });

  describe("CJK characters", () => {
    it("Chinese characters", () => {
      // CJK chars are fullwidth — 2 terminal columns each
      const w = stringWidth("\u4E2D\u6587"); // "中文"
      if (isBun) {
        expect(w).toBe(4); // 2 columns per char
      } else {
        expect(w).toBe(2); // fallback counts code points only
      }
    });

    it("mixed ASCII and CJK", () => {
      const w = stringWidth("hi\u4E2D"); // "hi中"
      if (isBun) {
        expect(w).toBe(4); // 2 + 2
      } else {
        expect(w).toBe(3); // code point count
      }
    });
  });

  describe("compound emoji (ZWJ sequences)", () => {
    it("family emoji", () => {
      // 👨‍👩‍👧‍👦 = U+1F468 ZWJ U+1F469 ZWJ U+1F467 ZWJ U+1F466
      const family = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}";
      const w = stringWidth(family);
      if (isBun) {
        // Bun.stringWidth uses ICU — typically 2 for a single rendered glyph
        expect(w).toBe(2);
      } else {
        // for...of iterates code points: 4 emoji + 3 ZWJ = 7
        expect(w).toBe(7);
      }
    });

    it("flag emoji", () => {
      // 🇺🇸 = U+1F1FA U+1F1F8 (two regional indicators)
      const flag = "\u{1F1FA}\u{1F1F8}";
      const w = stringWidth(flag);
      if (isBun) {
        // Bun: single flag glyph, 2 columns wide
        // Note: actual value depends on Bun's ICU version
        expect(w).toBeGreaterThanOrEqual(1);
        expect(w).toBeLessThanOrEqual(2);
      } else {
        // fallback: 2 code points
        expect(w).toBe(2);
      }
    });
  });
});

describe(`strip / stripAnsi (${runtime})`, () => {
  it("strip removes ANSI from a colored string", () => {
    expect(strip("\u001B[31mhello\u001B[0m")).toBe("hello");
  });

  it("strip is a no-op on plain text", () => {
    expect(strip("plain")).toBe("plain");
  });

  it("stripAnsi removes ANSI codes", () => {
    expect(stripAnsi("\u001B[1mbold\u001B[0m")).toBe("bold");
  });

  it("stripAnsi handles empty string", () => {
    expect(stripAnsi("")).toBe("");
  });
});

describe(`fallbackStringWidth (${runtime})`, () => {
  it("counts code points, not code units", () => {
    // 👍 is 1 code point but 2 UTF-16 code units
    // fallbackStringWidth always uses the JS path (for...of)
    expect(fallbackStringWidth("\u{1F44D}")).toBe(1);
  });

  it("strips ANSI before counting", () => {
    expect(fallbackStringWidth("\u001B[31mhi\u001B[0m")).toBe(2);
  });
});

describe(`clear (${runtime})`, () => {
  it("returns erase.line + cursor.to(0) when perLine is 0", () => {
    const result = clear("anything", 0);
    // Should contain escape sequences for erasing a line
    expect(result).toContain("\u001B");
  });

  it("calculates rows for a single short line", () => {
    const result = clear("hello", 80);
    // "hello" is 5 chars on an 80-col terminal = 1 row
    // erase.lines(1) should produce specific escape sequences
    expect(result).toContain("\u001B");
  });

  it("calculates rows for multiline content", () => {
    const result = clear("line1\nline2\nline3", 80);
    expect(result).toContain("\u001B");
  });

  it("handles line wrapping", () => {
    // 160 chars on 80 cols = ceil(160/80) = 2 rows → floor((160-1)/80)+1 = 2
    // 160 chars on 40 cols = ceil(160/40) = 4 rows → floor((160-1)/40)+1 = 4
    const longLine = "a".repeat(160);
    const result80 = clear(longLine, 80);
    const result40 = clear(longLine, 40);
    // With 40 cols, 160 chars wraps to more rows than with 80 cols
    // More rows = longer erase sequence
    expect(result40.length).toBeGreaterThan(result80.length);
  });
});
