import "server-only";

/**
 * lib/db.ts
 *
 * Prisma client singleton — patrón estándar para Next.js.
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "event", level: "error" },
            { emit: "event", level: "warn" },
          ]
        : [
            { emit: "event", level: "error" },
          ],
  });

db.$on("error" as never, (e: { message: string; target: string }) => {
  logger.error({ message: e.message, target: e.target }, "DB error");
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
