/**
 * components/notes/NoteViewer.tsx
 *
 * Muestra la nota clínica generada con acciones: Editar, Exportar PDF, Guardar.
 * Props: content (NoteContent tipado), noteId, sessionId.
 * Client Component — maneja las acciones de guardado/firma.
 */

"use client";

import { useState, useCallback } from "react";
import { Edit3, Download, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportNoteToPDF } from "@/lib/pdf";
import type { NoteContent } from "@/types";

interface NoteViewerProps {
  content:          NoteContent;
  noteId:           string;
  sessionId:        string;
  patientName?:     string;
  patientShortId?:  string;
  sessionNumber?:   number;
  scheduledAt?:     string;
  therapyModality?: string;
  psychologistName?: string;
  isAIGenerated?:   boolean;
  createdAt?:       string;
}

const SECTION_COLORS: Record<string, string> = {
  subjective:   "#056783",
  objective:    "#146b59",
  assessment:   "#a4f2db",
  plan:         "#9b59b6",
  data:         "#056783",
  behavior:     "#056783",
  intervention: "#146b59",
  response:     "#a4f2db",
  goals:        "#056783",
  content:      "#056783",
};

const SECTION_LABELS: Record<string, string> = {
  subjective:   "Subjetivo",
  objective:    "Objetivo",
  assessment:   "Análisis",
  plan:         "Plan",
  data:         "Datos",
  behavior:     "Comportamiento",
  intervention: "Intervención",
  response:     "Respuesta",
  goals:        "Objetivos",
  content:      "Nota",
};

function getSections(content: NoteContent): Array<{ key: string; value: string }> {
  const { format, ...rest } = content;
  return Object.entries(rest).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : "",
  }));
}

export function NoteViewer({
  content, noteId, sessionId,
  patientName = "Paciente",
  patientShortId = "000000",
  sessionNumber = 1,
  scheduledAt,
  therapyModality = "TCC",
  psychologistName = "Psicólogo/a",
  isAIGenerated = true,
  createdAt,
}: NoteViewerProps) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const sections = getSections(content);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: "reviewed" }),
      });
      if (!res.ok) throw new Error();
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [noteId]);

  const handleExportPDF = useCallback(() => {
    exportNoteToPDF({
      note: {
        content,
        format:        content.format,
        createdAt:     createdAt ?? new Date().toISOString(),
        isAIGenerated,
      },
      patient: {
        displayName:     patientName,
        shortId:         patientShortId,
        therapyModality,
        isAnonymized:    patientName.startsWith("Anon."),
      },
      session: {
        sessionNumber,
        scheduledAt: scheduledAt ?? new Date().toISOString(),
      },
      psychologistName,
    });
  }, [content, patientName, patientShortId, sessionNumber, scheduledAt, therapyModality, psychologistName, isAIGenerated, createdAt]);

  return (
    <div>
      {/* Secciones de la nota */}
      <div className="card-surface flex flex-col gap-3 relative">
        {/* Badge IA */}
        <span className="badge badge-ai absolute top-3 right-3 text-2xs">
          IA · Claude
        </span>

        {sections.map(({ key, value }) => (
          <div key={key}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div
                className="note-section-dot"
                style={{ background: SECTION_COLORS[key] ?? "#056783" }}
              />
              <p className="text-2xs font-extrabold font-headline uppercase tracking-wide text-primary">
                {SECTION_LABELS[key] ?? key}
              </p>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {value || <span className="italic text-text-disabled">Sin información disponible</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 mt-3">
        <button
          className="btn btn-ghost btn-sm flex-1 gap-1.5"
          onClick={() => {/* TODO: abrir editor inline */}}
        >
          <Edit3 size={13} />
          Editar
        </button>

        <button
          className="btn btn-outline btn-sm flex-1 gap-1.5"
          onClick={handleExportPDF}
        >
          <Download size={13} />
          PDF
        </button>

        <button
          onClick={handleSave}
          disabled={saveStatus === "saving" || saveStatus === "saved"}
          className={cn(
            "btn btn-sm flex-1 gap-1.5 transition-all",
            saveStatus === "saved"
              ? "btn-ghost text-success"
              : "btn-primary"
          )}
        >
          {saveStatus === "saving" && <Loader2 size={13} className="animate-spin" />}
          {saveStatus === "saved"  && <Check size={13} />}
          {saveStatus === "error"  && "Error"}
          {saveStatus === "idle"   && "Guardar"}
          {saveStatus === "saving" && "Guardando"}
          {saveStatus === "saved"  && "Guardada"}
        </button>
      </div>
    </div>
  );
}
