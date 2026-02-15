import {describe, expect, it} from "vitest";
import {escapeHTML, removeEventListener} from "../src/utils";

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

describe("removeEventListener", () => {
  it("does not throw when selector matches no element", () => {
    expect(() => removeEventListener("#nonexistent", "click", () => {})).not.toThrow();
  });
});
