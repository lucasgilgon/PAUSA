/**
 * types/index.ts — Barrel export
 */

export * from "./patient";
export * from "./session";
export * from "./note";
export * from "./security";

// ─── API response types compartidos ──────────────────────────────────────

import { z } from "zod";

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success:   z.literal(true),
    data:      dataSchema,
    timestamp: z.string().datetime(),
  });

export const ApiErrorSchema = z.object({
  success:   z.literal(false),
  error: z.object({
    code:    z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
  timestamp: z.string().datetime(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PaginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items:      z.array(itemSchema),
    total:      z.number().int().nonnegative(),
    page:       z.number().int().positive(),
    limit:      z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasMore:    z.boolean(),
  });
