import { describe, expect, it } from "vitest";
import { extractScanToken } from "./token";

describe("extractScanToken", () => {
  it("keeps a raw token", () => {
    expect(extractScanToken("abc_def-123")).toBe("abc_def-123");
  });

  it("reads token from a check-in URL", () => {
    expect(extractScanToken("https://app.example/checkin?token=abc_def-123")).toBe("abc_def-123");
    expect(extractScanToken("/checkin?token=abc_def-123&src=email")).toBe("abc_def-123");
  });
});
