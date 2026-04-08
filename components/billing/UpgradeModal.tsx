"use client";

/**
 * components/billing/UpgradeModal.tsx
 *
 * Modal que aparece cuando el usuario alcanza el límite de 10 min gratuitos.
 * Redirige al Payment Link de Stripe.
 */

import { Sparkles, Clock, CheckCircle, X } from "lucide-react";

// URL del Payment Link — no importar de @/lib/stripe (Prisma no es compatible con el cliente)
const STRIPE_PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK
  ?? "https://buy.stripe.com/test_6oU5kC9qp7F7cTVcOd4Ja00";

interface UpgradeModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  userId?:   string;   // Para pasar client_reference_id a Stripe
}

const FEATURES_FREE = [
  "10 minutos de transcripción",
  "Generación de notas IA (SOAP, DAP, BIRP)",
  "Hasta 5 pacientes",
];

const FEATURES_PREMIUM = [
  "Transcripción ilimitada",
  "Notas IA ilimitadas (Ollama local)",
  "Pacientes ilimitados",
  "Detección de riesgo avanzada",
  "Exportación de notas (PDF)",
  "Soporte prioritario",
];

export function UpgradeModal({ isOpen, onClose, userId }: UpgradeModalProps) {
  if (!isOpen) return null;

  // Añadir client_reference_id para identificar al usuario en el webhook
  const paymentUrl = userId
    ? `${STRIPE_PAYMENT_LINK}?client_reference_id=${userId}`
    : STRIPE_PAYMENT_LINK;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        {/* Header gradiente */}
        <div className="bg-gradient-to-br from-primary to-primary-dark px-6 pt-8 pb-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Sparkles size={28} className="text-white" />
          </div>
          <h2 id="upgrade-title" className="text-xl font-bold mb-1">
            Pasa a Premium
          </h2>
          <p className="text-white/80 text-sm">
            Has usado tus 10 minutos gratuitos.<br />
            Actualiza para continuar sin límites.
          </p>
        </div>

        {/* Planes */}
        <div className="p-6 space-y-4">

          {/* Free (actual) */}
          <div className="rounded-xl border border-border bg-surface-secondary p-4 opacity-60">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-text-primary text-sm">Plan Gratuito</span>
              <span className="text-xs bg-border text-text-secondary px-2 py-0.5 rounded-full font-medium">Actual</span>
            </div>
            <ul className="space-y-1.5">
              {FEATURES_FREE.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                  <Clock size={12} className="text-text-tertiary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Premium */}
          <div className="rounded-xl border-2 border-primary bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-text-primary">Premium</span>
              <div className="text-right">
                <span className="text-xl font-bold text-primary">19€</span>
                <span className="text-xs text-text-tertiary">/mes</span>
              </div>
            </div>
            <p className="text-2xs text-text-tertiary mb-3">Cancela cuando quieras · Sin permanencia</p>
            <ul className="space-y-1.5">
              {FEATURES_PREMIUM.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-text-primary">
                  <CheckCircle size={12} className="text-success flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-primary hover:bg-primary-dark text-white text-center font-semibold rounded-xl py-3.5 transition-colors shadow-md shadow-primary/25"
            onClick={onClose}
          >
            <span className="flex items-center justify-center gap-2">
              <Sparkles size={16} />
              Suscribirse a Premium — 19€/mes
            </span>
          </a>

          <p className="text-center text-2xs text-text-tertiary">
            Pago seguro con Stripe · Datos cifrados
          </p>
        </div>
      </div>
    </div>
  );
}
