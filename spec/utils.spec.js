import {describe, expect, it} from "vitest";
import {escape, escapeAttr, removeEventListener} from "../src/utils";

describe('escape', () => {
  it('escapes HTML special characters', () => {
    expect(escape("<script>alert('xss')</script>")).toBe("&lt;script&gt;alert('xss')&lt;/script&gt;");
  });

  it('returns empty string for empty input', () => {
    expect(escape("")).toBe("");
  });

  it('passes through safe strings unchanged', () => {
    expect(escape("Hello World")).toBe("Hello World");
  });
});

describe('escapeAttr', () => {
  it('escapes ampersands', () => {
    expect(escapeAttr("a&b")).toBe("a&amp;b");
  });

  it('escapes single quotes', () => {
    expect(escapeAttr("it's")).toBe("it&#39;s");
  });

  it('escapes double quotes', () => {
    expect(escapeAttr('say "hi"')).toBe("say &quot;hi&quot;");
  });

  it('escapes angle brackets', () => {
    expect(escapeAttr("<script>")).toBe("&lt;script&gt;");
  });
});

describe("removeEventListener", () => {
  it("does not throw when selector matches no element", () => {
    expect(() => removeEventListener("#nonexistent", "click", () => {})).not.toThrow();
  });
});
