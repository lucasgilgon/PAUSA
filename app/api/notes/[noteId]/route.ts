/**
 * app/api/notes/[noteId]/route.ts
 *
 * GET   /api/notes/[noteId] — Obtener nota completa
 * PATCH /api/notes/[noteId] — Actualizar status o contenido
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db }         from "@/lib/db";
import { noteLogger } from "@/lib/logger";
import { writeAudit, extractRequestContext } from "@/lib/audit";
import { apiSuccess, apiError, formatZodError } from "@/lib/utils";

const PatchNoteSchema = z.object({
  status:  z.enum(["draft", "reviewed", "signed", "rejected"]).optional(),
  content: z.record(z.string()).optional(),
  editReason: z.string().max(500).optional(),
}).refine(
  (d) => d.status !== undefined || d.content !== undefined,
  { message: "Proporciona status o content" }
);

export async function GET(
  request: NextRequest,
  { params }: { params: { noteId: string } }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });

  const { noteId } = params;

  const note = await db.note.findFirst({
    where:   { id: noteId, psychologistId: userId },
    include: { editHistory: { orderBy: { editedAt: "desc" }, take: 10 } },
  });

  if (!note) return NextResponse.json(apiError("NOT_FOUND", "Nota no encontrada"), { status: 404 });

  await writeAudit({
    psychologistId: userId, action: "session.note.view",
    resourceType: "note", resourceId: noteId,
    ...extractRequestContext(request),
  });

  return NextResponse.json(apiSuccess(note));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { noteId: string } }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });

  const { noteId } = params;

  const existing = await db.note.findFirst({
    where: { id: noteId, psychologistId: userId },
    select: { id: true, status: true, content: true },
  });

  if (!existing) return NextResponse.json(apiError("NOT_FOUND", "Nota no encontrada"), { status: 404 });

  if (existing.status === "signed") {
    return NextResponse.json(
      apiError("IMMUTABLE", "Las notas firmadas no se pueden modificar"),
      { status: 409 }
    );
  }

  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return NextResponse.json(apiError("INVALID_JSON", "Body inválido"), { status: 400 }); }

  const bodyResult = PatchNoteSchema.safeParse(rawBody);
  if (!bodyResult.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Datos inválidos", formatZodError(bodyResult.error)),
      { status: 422 }
    );
  }

  const { status, content, editReason } = bodyResult.data;

  if (content) {
    const prevContent = existing.content as Record<string, string>;
    const editRecords = Object.entries(content)
      .filter(([k, v]) => prevContent[k] !== v)
      .map(([field, newValue]) => ({
        noteId,
        editedBy:      userId,
        fieldChanged:  field,
        previousValue: prevContent[field] ?? "",
        newValue,
        reason:        editReason,
      }));

    if (editRecords.length > 0) {
      await db.noteEdit.createMany({ data: editRecords });
    }
  }

  const updated = await db.note.update({
    where: { id: noteId },
    data: {
      ...(status  ? { status } : {}),
      ...(content ? { content: content as never, wasEdited: true } : {}),
      ...(status === "signed" ? { signedAt: new Date(), signedBy: userId } : {}),
    },
  });

  await writeAudit({
    psychologistId: userId,
    action: status === "signed" ? "session.note.sign" : "session.note.edit",
    resourceType: "note", resourceId: noteId,
    ...extractRequestContext(request),
    metadata: { status, hasContentEdit: !!content },
  });

  noteLogger.info({ noteId, userId, status }, "Note updated");

  return NextResponse.json(apiSuccess({ id: updated.id, status: updated.status }));
}
