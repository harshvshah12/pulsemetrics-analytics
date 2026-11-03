import { describe, expect, it } from "vitest";
import { telemetryEventSchema } from "./validation";

describe("telemetryEventSchema", () => {
  it("accepts a valid application event and applies safe defaults", () => {
    const parsed = telemetryEventSchema.parse({
      service: "checkout-api",
      event_name: "payment.authorized",
      severity: "info",
      status_code: 200,
      latency_ms: 85,
    });
    expect(parsed.service).toBe("checkout-api");
    expect(parsed.attributes).toEqual({});
  });

  it("rejects a missing service name", () => {
    expect(telemetryEventSchema.safeParse({ service: "", severity: "info" }).success).toBe(false);
  });

  it("rejects invalid status codes and timestamps", () => {
    expect(telemetryEventSchema.safeParse({ service: "api", status_code: 99 }).success).toBe(false);
    expect(telemetryEventSchema.safeParse({ service: "api", occurred_at: "not-a-date" }).success).toBe(false);
  });

  it("rejects oversized attribute payloads", () => {
    expect(telemetryEventSchema.safeParse({
      service: "api",
      attributes: { payload: "x".repeat(17000) },
    }).success).toBe(false);
  });
});