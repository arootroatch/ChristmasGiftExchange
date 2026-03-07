import {describe, expect, it} from "vitest";
import {escape, escapeAttr, escapeHTML, removeEventListener} from "../src/utils";

describe("escapeHTML", () => {
  it("escapes angle brackets", () => {
    expect(escapeHTML("<script>alert('xss')</script>")).toBe("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
  });

  it("escapes ampersands", () => {
    expect(escapeHTML("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("escapes double quotes", () => {
    expect(escapeHTML('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHTML("it's")).toBe("it&#039;s");
  });

  it("returns normal strings unchanged", () => {
    expect(escapeHTML("Alex")).toBe("Alex");
  });

  it("handles empty string", () => {
    expect(escapeHTML("")).toBe("");
  });
});

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
