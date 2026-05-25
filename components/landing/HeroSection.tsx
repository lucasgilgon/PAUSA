"use client";

import { useEffect, useRef, useState } from "react";
import TrustBadges from "./TrustBadges";

export default function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  const handleLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setLeadSubmitted(true);
      // Aquí se conectaría con tu sistema de leads/email
    }
  };

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-[#F7F5F2]">
      <div className="landing-container relative z-10">
        <div ref={ref} className={`reveal max-w-4xl ${visible ? "visible" : ""}`}>
          <div className="mb-8">
            <div
              className="font-manrope text-[10px] font-medium uppercase tracking-[0.2em] text-[#8A8A8A] mb-4"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              LUCAS GIL GONZÁLEZ — MADRID, 2026
            </div>
            <div className="w-12 h-px bg-[#C4956A]" />
          </div>

          <h1 className="landing-h1 mb-4" style={{ fontFamily: "var(--font-playfair)" }}>
            <span className="hero-line" style={{ animationDelay: "0ms" }}>
              PAUSA.
            </span>
            <span className="hero-line" style={{ animationDelay: "220ms" }}>
              Menos papeleo,
            </span>
            <span className="hero-line" style={{ animationDelay: "440ms", color: "#C4956A" }}>
              más psicología.
            </span>
          </h1>

          <p
            className="text-[20px] leading-[1.7] text-[#5A5A5A] mb-8"
            style={{ fontFamily: "var(--font-public-sans)", maxWidth: "560px" }}
          >
            La IA que transcribe tus sesiones y genera notas clínicas automáticamente. 
            Formatos SOAP, DAP, BIRP, GIRP. Servidores en Europa. Desde 19€/mes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <a
              href="#contacto"
              className="inline-flex items-center justify-center px-10 py-4 bg-[#0B1F2E] text-white text-base font-semibold hover:bg-[#1A3A4F] btn-elegant"
              style={{ borderRadius: "12px" }}
            >
              Probar PAUSA gratis →
            </a>
            <a
              href="#producto"
              className="inline-flex items-center justify-center px-10 py-4 bg-transparent text-[#0B1F2E] text-base font-semibold border border-[#0B1F2E] hover:bg-[#0B1F2E]/5 btn-elegant"
              style={{ borderRadius: "12px" }}
            >
              Ver demo (90 seg)
            </a>
          </div>

          {/* Lead magnet */}
          {!leadSubmitted ? (
            <form onSubmit={handleLead} className="max-w-md mb-10">
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Tu email profesional"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 bg-[#FFFFFF] border border-[#E0DCD7] text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none input-glow transition-all"
                  style={{ borderRadius: "10px" }}
                />
                <button
                  type="submit"
                  className="px-5 py-3 bg-[#C4956A] text-white text-sm font-semibold hover:bg-[#B38459] transition-colors whitespace-nowrap"
                  style={{ borderRadius: "10px" }}
                >
                  Descargar guía
                </button>
              </div>
              <p className="text-xs text-[#8A8A8A] mt-2">
                Guía gratuita: 5 trucos para reducir el papeleo clínico en un 70%
              </p>
            </form>
          ) : (
            <div className="max-w-md mb-10 p-4 bg-[#E8F5EE] border border-[#2D6A4F]/20 text-center" style={{ borderRadius: "12px" }}>
              <p className="text-[#2D6A4F] font-semibold text-sm">¡Gracias! Revisa tu email para descargar la guía.</p>
            </div>
          )}

          <TrustBadges />

          <div className="mt-16 pt-8 border-t border-[#E0DCD7]">
            <p
              className="text-xs uppercase tracking-[0.15em] text-[#8A8A8A]"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              Proyecto independiente · IA local · Cumplimiento RGPD · 2026
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
