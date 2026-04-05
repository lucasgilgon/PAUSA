/**
 * lib/shared/risk-engine.ts
 *
 * Motor de detección de riesgo clínico — portable web/mobile/servidor.
 * Funciona en Node.js (Next.js), en el navegador y en React Native con Hermes.
 * NO depende de ningún framework.
 */

export type RiskLevel = "none" | "low" | "moderate" | "high" | "critical";

export interface RiskSignal {
  keyword:   string;
  level:     RiskLevel;
  category:  RiskCategory;
  context?:  string;
}

export type RiskCategory =
  | "suicidal_ideation"
  | "self_harm"
  | "harm_to_others"
  | "acute_psychosis"
  | "substance_crisis"
  | "other";

// Palabras clave por nivel de riesgo (español)
const CRITICAL_KEYWORDS: string[] = [
  "quiero morir", "quiero matarme", "suicidio", "suicidarme",
  "no quiero vivir", "acabar con mi vida", "quitarme la vida",
  "me voy a matar", "tengo un plan", "tengo pastillas",
  "ideación suicida", "intento de suicidio",
  "hacerme daño", "cortarme", "autolesión",
];

const HIGH_KEYWORDS: string[] = [
  "no tiene sentido vivir", "sería mejor que no estuviera",
  "todos estarían mejor sin mí", "pensamientos de muerte",
  "fantasías de muerte", "dañarme", "hacerle daño",
  "no puedo más", "al límite", "crisis",
];

const MODERATE_KEYWORDS: string[] = [
  "muy triste", "desesperado", "sin esperanza", "sin salida",
  "agotado", "no duermo", "aislado", "solo", "abandono",
  "alcohol", "drogas", "pastillas", "automedicación",
];

export interface RiskAnalysisResult {
  level:    RiskLevel;
  signals:  RiskSignal[];
  requiresImmediate: boolean;
}

export function analyzeRisk(text: string): RiskAnalysisResult {
  const lower   = text.toLowerCase();
  const signals: RiskSignal[] = [];

  for (const kw of CRITICAL_KEYWORDS) {
    if (lower.includes(kw)) {
      signals.push({ keyword: kw, level: "critical", category: "suicidal_ideation" });
    }
  }
  for (const kw of HIGH_KEYWORDS) {
    if (lower.includes(kw)) {
      signals.push({ keyword: kw, level: "high", category: "other" });
    }
  }
  for (const kw of MODERATE_KEYWORDS) {
    if (lower.includes(kw)) {
      signals.push({ keyword: kw, level: "moderate", category: "other" });
    }
  }

  const level: RiskLevel =
    signals.some((s) => s.level === "critical") ? "critical" :
    signals.some((s) => s.level === "high")     ? "high"     :
    signals.some((s) => s.level === "moderate") ? "moderate" :
    signals.length > 0 ? "low" : "none";

  return {
    level,
    signals,
    requiresImmediate: level === "critical" || level === "high",
  };
}

export const RISK_LEVEL_ORDER: RiskLevel[] = [
  "none", "low", "moderate", "high", "critical",
];

export function compareRisk(a: RiskLevel, b: RiskLevel): number {
  return RISK_LEVEL_ORDER.indexOf(a) - RISK_LEVEL_ORDER.indexOf(b);
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  none:     "Sin riesgo",
  low:      "Riesgo bajo",
  moderate: "Riesgo moderado",
  high:     "Riesgo alto",
  critical: "Riesgo crítico",
};
