import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function hashApiSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function safeDigestMatch(expectedHex: string, suppliedSecret: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(hashApiSecret(suppliedSecret), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function verifyHmacSignature(secret: string, rawBody: string, timestampHeader: string | null, signatureHeader: string | null) {
  if (!timestampHeader && !signatureHeader) return { valid: true };
  if (!timestampHeader || !signatureHeader) return { valid: false, reason: "Both signature headers are required." };
  const timestamp = Number(timestampHeader);
  if (!Number.isInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return { valid: false, reason: "Signature timestamp is outside the five-minute window." };
  }
  if (!/^[a-f0-9]{64}$/i.test(signatureHeader)) return { valid: false, reason: "Signature must be a SHA-256 hex digest." };

  const expected = createHmac("sha256", secret).update(timestampHeader + "." + rawBody, "utf8").digest();
  const supplied = Buffer.from(signatureHeader, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied)
    ? { valid: true }
    : { valid: false, reason: "Request signature verification failed." };
}