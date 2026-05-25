"use client";

import { useEffect, useRef, useState } from "react";

const stats = [
  { value: "3–4 h", label: "escribiendo notas cada día", source: "Estudio burnout psicólogos, 2024" },
  { value: "60%", label: "sin herramienta digital decente", source: "COP Madrid, encuesta 2023" },
  { value: "50K+", label: "psicólogos en España solos con esto", source: "Colegio Oficial de Psicólogos, 2025" },
  { value: "1 de 4", label: "españoles necesitará ayuda psicológica", source: "OMS, 2024" },
];

export default function ProblemSection() {
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
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="producto" className="landing-section bg-[#F7F5F2]">
      <div className="landing-container">
        <div ref={ref} className={`reveal ${visible ? "visible" : ""}`}>
          <div className="max-w-3xl">
            <div className="landing-label mb-4">El problema</div>
            <h2
              className="landing-h2 mb-8"
              style={{ fontFamily: "var(--font-playfair)", fontWeight: 500, color: "#0B1F2E" }}
            >
              He visto a psicólogos terminar la jornada y{" "}
              <span className="text-[#9B3A3A]">seguir escribiendo</span> hasta
              la madrugada.
            </h2>

            <div className="space-y-6 landing-body-text">
              <p>
                Mi hermana es psicóloga clínica. Durante años la he visto
                llegar a casa agotada, cenar con los ojos en el móvil
                terminando una nota que se le había olvidado, o peor: acumular
                tres días de sesiones sin documentar porque no daba abasto.
              </p>
              <p>
                Y no es que sea desorganizada. Es que el sistema está roto. La
                administración sanitaria exige documentación rigurosa. El
                colegio profesional exige ética. Y entre ambas cosas, el
                psicólogo se queda solo, con un Word abierto a las 23:00,
                intentando recordar qué dijo el paciente en la tercera sesión
                del martes.
              </p>
              <p>
                He mirado las herramientas que existen. Unas mandan los datos a
                servidores en California. Otras cuestan lo que un coche. Y la
                mayoría están diseñadas por gente que nunca ha estado en una
                consulta de terapia.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="p-5 bg-[#FFFFFF] border border-[#E0DCD7]"
                  style={{ borderRadius: "12px" }}
                >
                  <div
                    className="text-2xl md:text-3xl font-medium mb-1"
                    style={{ fontFamily: "var(--font-playfair)", color: "#C4956A" }}
                  >
                    {item.value}
                  </div>
                  <div className="text-sm text-[#5A5A5A] leading-snug mb-2">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-[#8A8A8A] leading-tight">
                    Fuente: {item.source}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <a
                href="#solucion"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-[#0B1F2E] text-white text-base font-semibold hover:bg-[#1A3A4F] btn-elegant"
                style={{ borderRadius: "12px" }}
              >
                Esto le pasaba a mi hermana. A ella ya no. → Ver cómo funciona
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
