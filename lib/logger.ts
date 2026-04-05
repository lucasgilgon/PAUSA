/**
 * lib/logger.ts
 */

import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),

  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize:    true,
            translateTime: "HH:MM:ss",
            ignore:      "pid,hostname",
          },
        },
      }
    : {}),

  base: {
    env:     process.env.NODE_ENV,
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",
  },

  serializers: {
    err:     pino.stdSerializers.err,
    req:     pino.stdSerializers.req,
    res:     pino.stdSerializers.res,

    patient: (p: { id?: string }) => ({ id: p.id }),
    session: (s: { id?: string; patientId?: string }) => ({
      id:        s.id,
      patientId: s.patientId,
    }),
  },

  redact: {
    paths: [
      "firstName", "lastName", "dateOfBirth",
      "email", "phone",
      "emergencyName", "emergencyPhone",
      "encryptedData", "apiKey",
      "*.firstName", "*.lastName",
      "*.email", "*.phone",
    ],
    censor: "[REDACTED]",
  },
});

// ─── Child loggers por módulo ─────────────────────────────────────────────

export const authLogger        = logger.child({ module: "auth" });
export const patientLogger     = logger.child({ module: "patient" });
export const sessionLogger     = logger.child({ module: "session" });
export const transcribeLogger  = logger.child({ module: "transcribe" });
export const noteLogger        = logger.child({ module: "note" });
export const securityLogger    = logger.child({ module: "security" });
export const cryptoLogger      = logger.child({ module: "crypto" });
