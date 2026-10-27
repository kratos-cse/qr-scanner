import { describe, expect, it } from "vitest";
import { shouldSubmitToken } from "./throttle";

describe("shouldSubmitToken", () => {
  it("submits a new token", () => {
    expect(shouldSubmitToken("abc", null, false)).toBe(true);
  });

  it("does not resubmit the same token while it stays in frame", () => {
    expect(shouldSubmitToken("abc", "abc", false)).toBe(false);
  });

  it("allows a different token", () => {
    expect(shouldSubmitToken("def", "abc", false)).toBe(true);
  });

  it("blocks while a request is in flight", () => {
    expect(shouldSubmitToken("def", null, true)).toBe(false);
  });
});
