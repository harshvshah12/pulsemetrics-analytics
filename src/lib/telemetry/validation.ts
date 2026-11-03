import { z } from "zod";

export const telemetryEventSchema = z.object({
  service: z.string().trim().min(1).max(100),
  event_name: z.string().trim().max(120).optional(),
  message: z.string().max(4000).optional(),
  severity: z.enum(["debug", "info", "warn", "error", "critical"]).default("info"),
  status_code: z.number().int().min(100).max(599).optional(),
  latency_ms: z.number().finite().min(0).max(3600000).optional(),
  occurred_at: z.string().optional(),
  region: z.string().trim().max(40).optional(),
  attributes: z.record(z.string(), z.unknown()).default({}),
}).strict().superRefine((event, ctx) => {
  if (event.occurred_at && Number.isNaN(Date.parse(event.occurred_at))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["occurred_at"], message: "occurred_at must be a valid date." });
  }
  if (Buffer.byteLength(JSON.stringify(event.attributes), "utf8") > 16000) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["attributes"], message: "attributes must be smaller than 16 KB." });
  }
});

export type TelemetryEventInput = z.infer<typeof telemetryEventSchema>;