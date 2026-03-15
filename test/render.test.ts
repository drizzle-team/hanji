import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, Prompt, ITerminal } from "../src/index";

class TestPrompt extends Prompt<string> {
  result(): string {
    return "test-result";
  }
  render(status: "idle" | "submitted" | "aborted"): string {
    return `[${status}]`;
  }
}

describe("render", () => {
  describe("with a string argument", () => {
    it("writes the string to stdout with a newline", () => {
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);

      const result = render("hello world");

      expect(result).toBeUndefined();
      expect(writeSpy).toHaveBeenCalledWith("hello world\n");
      writeSpy.mockRestore();
    });

    it("does not require a TTY", () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });

      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);

      const result = render("works without tty");

      expect(result).toBeUndefined();
      expect(writeSpy).toHaveBeenCalledWith("works without tty\n");

      writeSpy.mockRestore();
      Object.defineProperty(process.stdin, "isTTY", { value: originalIsTTY, configurable: true });
    });
  });

  describe("with a Prompt argument and no TTY", () => {
    it("rejects when stdin is not a TTY", async () => {
      const originalStdinIsTTY = process.stdin.isTTY;
      const originalStdoutIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });
      Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

      const view = new TestPrompt();
      const promise = render(view);

      await expect(promise).rejects.toThrow("Interactive prompts require a TTY terminal");

      Object.defineProperty(process.stdin, "isTTY", { value: originalStdinIsTTY, configurable: true });
      Object.defineProperty(process.stdout, "isTTY", { value: originalStdoutIsTTY, configurable: true });
    });

    it("rejects when stdout is not a TTY", async () => {
      const originalStdinIsTTY = process.stdin.isTTY;
      const originalStdoutIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
      Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });

      const view = new TestPrompt();
      const promise = render(view);

      await expect(promise).rejects.toThrow("Interactive prompts require a TTY terminal");

      Object.defineProperty(process.stdin, "isTTY", { value: originalStdinIsTTY, configurable: true });
      Object.defineProperty(process.stdout, "isTTY", { value: originalStdoutIsTTY, configurable: true });
    });

    it("rejects when both stdin and stdout are not TTYs", async () => {
      const originalStdinIsTTY = process.stdin.isTTY;
      const originalStdoutIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });
      Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });

      const view = new TestPrompt();
      const promise = render(view);

      await expect(promise).rejects.toThrow("Interactive prompts require a TTY terminal");

      Object.defineProperty(process.stdin, "isTTY", { value: originalStdinIsTTY, configurable: true });
      Object.defineProperty(process.stdout, "isTTY", { value: originalStdoutIsTTY, configurable: true });
    });
  });
});
