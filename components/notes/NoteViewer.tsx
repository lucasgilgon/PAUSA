/**
 * components/notes/NoteViewer.tsx
 *
 * Muestra la nota clínica generada con acciones: Editar, Exportar PDF, Guardar.
 * Props: content (NoteContent tipado), noteId, sessionId.
 * Client Component — maneja las acciones de guardado/firma.
 */

"use client";

import { useState, useCallback } from "react";
import { Edit3, Download, Check, Loader2, X, Save } from "lucide-react";
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
  const [isEditing,  setIsEditing]  = useState(false);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
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

  const handleStartEdit = useCallback(() => {
    const initial: Record<string, string> = {};
    getSections(content).forEach(({ key, value }) => { initial[key] = value; });
    setEditedContent(initial);
    setIsEditing(true);
  }, [content]);

  const handleSaveEdit = useCallback(async () => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: editedContent }),
      });
      if (!res.ok) throw new Error();
      // Reflect edits in the view without reload
      Object.assign(content, editedContent);
      setIsEditing(false);
    } catch {
      // keep editor open on error
    } finally {
      setEditSaving(false);
    }
  }, [noteId, editedContent, content]);

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
      {/* ── Modo lectura ──────────────────────────────────────────────────── */}
      {!isEditing && (
        <div className="card-surface flex flex-col gap-3 relative">
          <span className="badge badge-ai absolute top-3 right-3 text-2xs">
            IA · Ollama
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
              <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                {value || <span className="italic text-text-disabled">Sin información disponible</span>}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Modo edición ──────────────────────────────────────────────────── */}
      {isEditing && (
        <div className="card-surface flex flex-col gap-4">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">
            Editando nota
          </p>

          {sections.map(({ key }) => (
            <div key={key}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className="note-section-dot"
                  style={{ background: SECTION_COLORS[key] ?? "#056783" }}
                />
                <label className="text-2xs font-extrabold font-headline uppercase tracking-wide text-primary">
                  {SECTION_LABELS[key] ?? key}
                </label>
              </div>
              <textarea
                value={editedContent[key] ?? ""}
                onChange={(e) =>
                  setEditedContent((prev) => ({ ...prev, [key]: e.target.value }))
                }
                rows={5}
                className={cn(
                  "w-full text-xs text-text-primary leading-relaxed resize-none",
                  "bg-surface-secondary border border-border rounded-lg px-3 py-2.5",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                  "transition-colors"
                )}
              />
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setIsEditing(false)}
              className="btn btn-ghost btn-sm flex-1 gap-1.5"
              disabled={editSaving}
            >
              <X size={13} />
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={editSaving}
              className="btn btn-primary btn-sm flex-1 gap-1.5"
            >
              {editSaving
                ? <Loader2 size={13} className="animate-spin" />
                : <Save size={13} />}
              {editSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      {/* ── Acciones ──────────────────────────────────────────────────────── */}
      {!isEditing && (
        <div className="flex gap-2 mt-3">
          <button
            className="btn btn-ghost btn-sm flex-1 gap-1.5"
            onClick={handleStartEdit}
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
      )}
    </div>
  );
}
