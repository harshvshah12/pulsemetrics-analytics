import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashApiSecret, safeDigestMatch, verifyHmacSignature } from "@/lib/telemetry/signatures";

describe("telemetry request security", () => {
  it("hashes and compares API secrets without storing plaintext", () => {
    const secret = "test-secret-value";
    const digest = hashApiSecret(secret);
    expect(digest).toHaveLength(64);
    expect(digest).not.toBe(secret);
    expect(safeDigestMatch(digest, secret)).toBe(true);
    expect(safeDigestMatch(digest, "wrong-secret")).toBe(false);
  });

  it("accepts a valid HMAC over timestamp and exact request body", () => {
    const secret = "test-signing-secret";
    const body = '{"service":"payments"}';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac("sha256", secret).update(timestamp + "." + body).digest("hex");
    expect(verifyHmacSignature(secret, body, timestamp, signature)).toEqual({ valid: true });
  });

  it("rejects stale and altered request signatures", () => {
    const secret = "test-signing-secret";
    const body = '{"service":"payments"}';
    const staleTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
    const staleSignature = createHmac("sha256", secret).update(staleTimestamp + "." + body).digest("hex");
    expect(verifyHmacSignature(secret, body, staleTimestamp, staleSignature).valid).toBe(false);

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac("sha256", secret).update(timestamp + "." + body).digest("hex");
    expect(verifyHmacSignature(secret, body + " ", timestamp, signature).valid).toBe(false);
  });
});