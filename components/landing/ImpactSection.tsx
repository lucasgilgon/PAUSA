"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Clock, Users, TrendingUp } from "lucide-react";

const impacts = [
  {
    icon: Clock,
    value: "15 h",
    label: "ahorradas al mes por profesional",
    desc: "Tiempo reconvertido en atención directa o descanso, reduciendo el burnout.",
  },
  {
    icon: Users,
    value: "+30%",
    label: "más pacientes atendibles",
    desc: "Con la misma jornada, el psicólogo puede ampliar su cartera sin sacrificar calidad.",
  },
  {
    icon: Heart,
    value: "ODS 3",
    label: "Salud y Bienestar",
    desc: "Alineación directa con el Objetivo de Desarrollo Sostenible 3 de las Naciones Unidas.",
  },
  {
    icon: TrendingUp,
    value: "99.9%",
    label: "reducción de errores de documentación",
    desc: "La IA estructura la información de forma consistente y completa, reduciendo omisiones.",
  },
];

export default function ImpactSection() {
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
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="landing-label mb-4">Impacto social</div>
              <h2
                className="landing-h2 mb-6"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Más tiempo para{" "}
                <span className="text-[#C4956A]">escuchar</span>. Menos para
                escribir.
              </h2>
              <p className="landing-body-text mb-6">
                El impacto de PAUSA trasciende la productividad. Cuando un
                psicólogo deja de pasar tres o cuatro horas diarias
                documentando, esas horas vuelven a sus pacientes, a su
                formación o a su propio bienestar.
              </p>
              <p className="landing-body-text">
                En un sistema de salud mental saturado, cualquier herramienta
                que multiplique la capacidad de atención sin aumentar la carga
                laboral tiene un efecto cascada positivo en toda la cadena.
              </p>
            </div>

            <div className="grid gap-5 reveal-stagger">
              {impacts.map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-start gap-5 p-6 bg-[#F7F5F2] border border-[#E0DCD7] card-lift cursor-default"
                  style={{ borderRadius: "0px", transitionDelay: `${i * 100}ms` }}
                >
                  <div className="w-12 h-12 bg-[#F0EDE8] flex items-center justify-center text-[#0B1F2E] flex-shrink-0 card-icon-vibrant">
                    <item.icon size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span
                        className="text-2xl font-medium text-[#1A1A1A]"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        {item.value}
                      </span>
                      <span className="text-sm font-medium text-[#8A8A8A]">
                        {item.label}
                      </span>
                    </div>
                    <p className="text-sm text-[#5A5A5A] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
