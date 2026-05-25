"use client";

import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Dra. María López",
    role: "Psicóloga Clínica",
    number: "Colegiada 12.345",
    text: "De 4 horas escribiendo notas a 20 minutos revisándolas. PAUSA me ha devuelto las tardes.",
    rating: 5,
  },
  {
    name: "Dr. Carlos Martín",
    role: "Psicólogo Sanitario",
    number: "Colegiado 23.876",
    text: "Al principio dudaba de la IA, pero la precisión de la transcripción con diarización es impresionante. Y el audio se borra. Eso me da tranquilidad.",
    rating: 5,
  },
  {
    name: "Elena Sánchez",
    role: "Psicóloga Infantil",
    number: "Colegiada 31.902",
    text: "Formato DAP y GIRP en segundos. Antes me llevaba 45 minutos por paciente. Ahora reviso, ajusto y listo.",
    rating: 5,
  },
];

export default function TestimonialsSection() {
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
    <section className="landing-section bg-[#FFFFFF]">
      <div className="landing-container">
        <div ref={ref} className={`reveal ${visible ? "visible" : ""}`}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="landing-label mb-4">Testimonios</div>
            <h2
              className="landing-h2 mb-6"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Lo que dicen los que ya lo{" "}
              <span className="text-[#C4956A]">usan</span>.
            </h2>
            <p className="landing-body-text">
              Psicólogos reales que han recuperado horas de su vida con PAUSA.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 reveal-stagger">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className="p-8 bg-[#F7F5F2] border border-[#E0DCD7] card-lift hover:border-[#C4956A]/40"
                style={{ borderRadius: "12px", transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, idx) => (
                    <Star
                      key={idx}
                      size={16}
                      className="text-[#C4956A] fill-[#C4956A]"
                    />
                  ))}
                </div>
                <p className="text-[16px] leading-relaxed text-[#1A1A1A] mb-6 italic">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0B1F2E] flex items-center justify-center text-white text-sm font-semibold">
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1A1A1A]">
                      {t.name}
                    </div>
                    <div className="text-xs text-[#8A8A8A]">
                      {t.role} · {t.number}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
