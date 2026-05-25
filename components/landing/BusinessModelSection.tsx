"use client";

import { useEffect, useRef, useState } from "react";

export default function BusinessModelSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="precio" className="landing-section bg-[#F7F5F2]">
      <div className="landing-container">
        <div ref={ref} className={`reveal ${visible ? "visible" : ""}`}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="landing-label mb-4">Modelo de negocio</div>
            <h2
              className="landing-h2 mb-6"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Un modelo que funciona.{" "}
              <span className="text-[#C4956A]">Y que los psicólogos entienden</span>.
            </h2>
            <p className="landing-body-text">
              El sector está concentrado: los conoces por los colegios, los congresos, las comunidades. No hace falta quemar millones en anuncios para llegar a ellos. El problema es real y nadie lo está resolviendo bien.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16 reveal-stagger">
            {[
              {
                value: "€19",
                sub: "/mes por profesional",
                desc: "Un café al día. Por una herramienta que les devuelve horas de su vida.",
              },
              {
                value: "Bajo",
                sub: "Coste de adquisición (CAC)",
                desc: "Llegas a ellos donde ya están. No necesitas inventar canales de marketing.",
              },
              {
                value: "50K+",
                sub: "Profesionales objetivo España",
                desc: "España primero. Portugal, Italia y Francia después. El problema es el mismo en todas partes.",
              },
            ].map((item, i) => (
              <div
                key={item.sub}
                className="text-center p-8 bg-[#FFFFFF] border border-[#E0DCD7] card-lift hover:border-[#C4956A]/40"
                style={{ borderRadius: "12px", transitionDelay: `${i * 100}ms` }}
              >
                <div
                  className="text-5xl font-medium text-[#0B1F2E] mb-3"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {item.value}
                </div>
                <div className="text-sm font-semibold text-[#1A1A1A] mb-2">
                  {item.sub}
                </div>
                <div className="text-sm text-[#5A5A5A]">{item.desc}</div>
              </div>
            ))}
          </div>

          {/* Comparativa de precios */}
          <div className="max-w-3xl mx-auto mb-16">
            <div
              className="bg-[#FFFFFF] border border-[#E0DCD7] p-6 md:p-8"
              style={{ borderRadius: "12px" }}
            >
              <h3
                className="text-center mb-6 text-lg font-semibold"
                style={{ fontFamily: "var(--font-manrope)", color: "#0B1F2E" }}
              >
                Comparativa mensual
              </h3>
              <div className="space-y-4">
                {[
                  { label: "PAUSA", price: "19€/mes", highlight: true },
                  { label: "Herramienta X (competencia)", price: "150€/mes", highlight: false },
                  { label: "Tu tiempo (3-4h/día × 20 días)", price: "Priceless", highlight: false },
                ].map((row) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between p-4 ${
                      row.highlight
                        ? "bg-[#0B1F2E] text-white"
                        : "bg-[#F7F5F2] text-[#1A1A1A]"
                    }`}
                    style={{ borderRadius: "10px" }}
                  >
                    <span className="font-medium text-sm">{row.label}</span>
                    <span
                      className={`font-semibold ${
                        row.highlight ? "text-[#C4956A]" : "text-[#5A5A5A]"
                      }`}
                    >
                      {row.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <h3
              className="text-center mb-8 text-2xl font-semibold"
              style={{ fontFamily: "var(--font-playfair)", color: "#0B1F2E" }}
            >
              Los números, sin adornos
            </h3>
            <div className="grid md:grid-cols-3 gap-6 reveal-stagger">
              {[
                {
                  label: "El mercado",
                  value: "€4.8B",
                  desc: "Lo que se mueve en salud mental digital a nivel mundial. Y crece.",
                },
                {
                  label: "Donde empezamos",
                  value: "€420M",
                  desc: "Psicólogos clínicos en España, Francia, Italia y Portugal.",
                },
                {
                  label: "Año 3, si lo hacemos bien",
                  value: "€8.5M",
                  desc: "3.700 psicólogos × 19€/mes. Matemáticas simples.",
                },
              ].map((m, i) => (
                <div
                  key={m.label}
                  className="p-6 bg-[#FFFFFF] border border-[#E0DCD7] text-center card-lift hover:border-[#C4956A]/40"
                  style={{ borderRadius: "12px", transitionDelay: `${i * 100}ms` }}
                >
                  <span
                    className="inline-block px-3 py-1 text-xs font-bold mb-4 bg-[#F0EDE8] text-[#0B1F2E]"
                    style={{ borderRadius: "8px" }}
                  >
                    {m.label}
                  </span>
                  <div
                    className="text-3xl font-medium text-[#0B1F2E] mb-2"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {m.value}
                  </div>
                  <p className="text-sm text-[#5A5A5A]">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <a
              href="#contacto"
              className="inline-flex items-center justify-center px-10 py-4 bg-[#0B1F2E] text-white text-base font-semibold hover:bg-[#1A3A4F] btn-elegant"
              style={{ borderRadius: "12px" }}
            >
              Empezar ahora — Sin tarjeta
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
