/**
 * lib/pdf.ts
 *
 * Exportación de notas clínicas a PDF.
 *
 * Estrategia: generamos un documento HTML con estilos de impresión
 * y abrimos window.print() en una ventana nueva. El navegador
 * gestiona la conversión a PDF (funciona en Chrome, Firefox, Safari).
 *
 * NO usamos librerías externas (jsPDF, puppeteer) para no añadir
 * dependencias pesadas — el resultado con print CSS es igual de profesional.
 *
 * Solo se llama desde el cliente (no importar en Server Components).
 */

import type { NoteContent } from "@/types";

export interface ExportNoteOptions {
  note: {
    content:       NoteContent;
    format:        string;
    createdAt:     string;
    signedAt?:     string;
    isAIGenerated: boolean;
  };
  patient: {
    displayName:     string;
    shortId:         string;
    therapyModality: string;
    isAnonymized:    boolean;
  };
  session: {
    sessionNumber: number;
    scheduledAt:   string;
    durationMinutes?: number;
  };
  psychologistName: string;
}

const SECTION_LABELS: Record<string, string> = {
  subjective:   "Subjetivo",
  objective:    "Objetivo",
  assessment:   "Análisis / Impresión clínica",
  plan:         "Plan terapéutico",
  data:         "Datos",
  behavior:     "Comportamiento",
  intervention: "Intervención",
  response:     "Respuesta",
  goals:        "Objetivos",
  content:      "Nota clínica",
};

function buildNoteSections(content: NoteContent): string {
  const { format, ...fields } = content;
  return Object.entries(fields)
    .map(([key, value]) => `
      <div class="section">
        <h3>${SECTION_LABELS[key] ?? key}</h3>
        <p>${(value as string).replace(/\n/g, "<br>")}</p>
      </div>
    `)
    .join("");
}

export function exportNoteToPDF(opts: ExportNoteOptions): void {
  const { note, patient, session, psychologistName } = opts;

  const sessionDate = new Date(session.scheduledAt).toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const generatedAt = new Date(note.createdAt).toLocaleString("es-ES");
  const signedAt    = note.signedAt
    ? new Date(note.signedAt).toLocaleString("es-ES")
    : null;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Nota clínica — ${patient.displayName} — Sesión #${session.sessionNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 0;
    }

    .page {
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 48px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #056783;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .logo {
      font-size: 22pt;
      font-weight: 800;
      color: #056783;
      letter-spacing: -0.5px;
    }

    .logo span { color: #146b59; }

    .header-meta {
      text-align: right;
      font-size: 9pt;
      color: #666;
      line-height: 1.5;
    }

    /* Patient block */
    .patient-block {
      background: #f0f6f7;
      border-left: 4px solid #056783;
      border-radius: 0 8px 8px 0;
      padding: 14px 18px;
      margin-bottom: 24px;
    }

    .patient-block h2 {
      font-size: 14pt;
      font-weight: 700;
      color: #056783;
      margin-bottom: 6px;
    }

    .patient-block .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 24px;
      font-size: 9.5pt;
      color: #444;
    }

    .patient-block .meta-grid span { font-weight: 600; color: #222; }

    /* Format badge */
    .format-badge {
      display: inline-block;
      background: #056783;
      color: white;
      font-size: 8.5pt;
      font-weight: 700;
      padding: 3px 12px;
      border-radius: 20px;
      margin-bottom: 20px;
      letter-spacing: 0.5px;
    }

    .ai-badge {
      display: inline-block;
      background: #a4f2db;
      color: #033d2d;
      font-size: 8pt;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 20px;
      margin-left: 8px;
      letter-spacing: 0.3px;
    }

    /* Sections */
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .section h3 {
      font-size: 9pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #056783;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #d0e4ea;
    }

    .section p {
      font-size: 10.5pt;
      color: #333;
      line-height: 1.7;
    }

    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #d0e4ea;
      font-size: 8.5pt;
      color: #888;
      display: flex;
      justify-content: space-between;
    }

    .signature-block {
      margin-top: 48px;
      page-break-inside: avoid;
    }

    .signature-block .line {
      border-top: 1px solid #333;
      width: 240px;
      margin-bottom: 6px;
    }

    .signature-block p {
      font-size: 9pt;
      color: #555;
    }

    .confidential {
      background: #fdeaea;
      border: 1px solid #f09b9a;
      border-radius: 6px;
      padding: 8px 14px;
      margin-bottom: 20px;
      font-size: 8.5pt;
      color: #7a2222;
      text-align: center;
    }

    @media print {
      body { padding: 0; }
      .page { padding: 20px 28px; }
      @page { margin: 1.5cm 2cm; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo">Pau<span>sa</span></div>
    <div class="header-meta">
      Nota generada: ${generatedAt}<br>
      ${signedAt ? `Firmada: ${signedAt}<br>` : ""}
      Documento confidencial
    </div>
  </div>

  <!-- Confidencialidad -->
  <div class="confidential">
    ⚠ DOCUMENTO CONFIDENCIAL — Historia clínica protegida por el RGPD (UE) 2016/679.
    Uso exclusivo del profesional sanitario. Prohibida su divulgación.
  </div>

  <!-- Datos del paciente -->
  <div class="patient-block">
    <h2>${patient.displayName}</h2>
    <div class="meta-grid">
      <div>Paciente: <span>P-${patient.shortId}</span></div>
      <div>Sesión: <span>#${session.sessionNumber}</span></div>
      <div>Fecha: <span>${sessionDate}</span></div>
      <div>Modalidad: <span>${patient.therapyModality}</span></div>
      ${session.durationMinutes ? `<div>Duración: <span>${session.durationMinutes} min</span></div>` : ""}
      <div>Psicólogo/a: <span>${psychologistName}</span></div>
    </div>
  </div>

  <!-- Formato + IA badge -->
  <div>
    <span class="format-badge">${note.format}</span>
    ${note.isAIGenerated ? '<span class="ai-badge">Generada con IA · Claude</span>' : ""}
  </div>

  <!-- Contenido de la nota -->
  ${buildNoteSections(note.content)}

  <!-- Firma -->
  <div class="signature-block">
    <div class="line"></div>
    <p>${psychologistName}</p>
    <p>Psicólogo/a — Colegiado/a</p>
    ${signedAt ? `<p>Firmado digitalmente: ${signedAt}</p>` : "<p>Pendiente de firma</p>"}
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>Pausa Health · Nota clínica cifrada AES-256</span>
    <span>Generado: ${generatedAt}</span>
  </div>

</div>

<script>
  // Auto-print al cargar
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</body>
</html>`;

  // Abrir en ventana nueva y lanzar print
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Activa las ventanas emergentes para exportar el PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
