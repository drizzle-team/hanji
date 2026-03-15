import { describe, it, expect, vi, beforeEach } from "vitest";
import readline from "readline";

describe("readline module", () => {
  describe("createClosable", () => {
    it("returns an object with a close method", async () => {
      const { createClosable } = await import("../src/readline");
      const closable = createClosable();

      expect(closable).toBeDefined();
      expect(typeof closable.close).toBe("function");

      closable.close();
    });

    it("returns a new instance on each call", async () => {
      const { createClosable } = await import("../src/readline");
      const a = createClosable();
      const b = createClosable();

      expect(a).not.toBe(b);

      a.close();
      b.close();
    });
  });

  describe("emitKeypressEvents", () => {
    it("is called only once across multiple imports", async () => {
      const spy = vi.spyOn(readline, "emitKeypressEvents");
      const callCountBefore = spy.mock.calls.length;

      // Dynamic re-import won't re-execute the module (already cached),
      // so emitKeypressEvents should not be called again
      await import("../src/readline");
      await import("../src/readline");

      expect(spy.mock.calls.length).toBe(callCountBefore);
      spy.mockRestore();
    });
  });

  describe("stdin and stdout exports", () => {
    it("exports stdin as process.stdin", async () => {
      const { stdin } = await import("../src/readline");
      expect(stdin).toBe(process.stdin);
    });

    it("exports stdout as process.stdout", async () => {
      const { stdout } = await import("../src/readline");
      expect(stdout).toBe(process.stdout);
    });
  });
});
