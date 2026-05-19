"use client";

import { useEffect, useRef, useState } from "react";

export default function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

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

          <h1 className="landing-h1 mb-8" style={{ fontFamily: "var(--font-playfair)" }}>
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
            className="mb-10 text-[20px] leading-[1.7] text-[#5A5A5A]"
            style={{ fontFamily: "var(--font-public-sans)", maxWidth: "560px" }}
          >
            Conozco a psicólogos que terminan la última sesión a las ocho y
            siguen escribiendo notas a las once. No porque quieran. Porque no
            hay otra forma. Hasta ahora.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#inversion"
              className="inline-flex items-center justify-center px-10 py-4 bg-[#0B1F2E] text-white text-base font-semibold hover:bg-[#1A3A4F] btn-elegant"
              style={{ borderRadius: "0px" }}
            >
              Si tienes un rato, hablamos
            </a>
            <a
              href="#producto"
              className="inline-flex items-center justify-center px-10 py-4 bg-transparent text-[#0B1F2E] text-base font-semibold border border-[#0B1F2E] hover:bg-[#0B1F2E]/5 btn-elegant"
              style={{ borderRadius: "0px" }}
            >
              Qué es esto exactamente
            </a>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-[#E0DCD7]">
          <p
            className="text-xs uppercase tracking-[0.15em] text-[#8A8A8A]"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            Proyecto independiente · IA local · Cumplimiento RGPD · 2026
          </p>
        </div>
      </div>
    </section>
  );
}
