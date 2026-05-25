"use client";

import { useEffect, useRef, useState } from "react";

export default function TeamSection() {
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
    <section id="equipo" className="landing-section bg-[#FFFFFF]">
      <div className="landing-container">
        <div ref={ref} className={`reveal ${visible ? "visible" : ""}`}>
          <div className="max-w-3xl">
            <div className="landing-label mb-4">Quién está detrás</div>
            <h2
              className="landing-h2 mb-8"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              No soy una empresa.{" "}
              <span className="text-[#C4956A]">Soy una persona</span> con un
              problema que resolver.
            </h2>

            <div
              className="bg-[#F7F5F2] border border-[#E0DCD7] p-8 md:p-10"
              style={{ borderRadius: "12px" }}
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Avatar con iniciales */}
                <div
                  className="w-24 h-24 bg-gradient-to-br from-[#0B1F2E] to-[#1A3A4F] flex items-center justify-center flex-shrink-0"
                  style={{ borderRadius: "50%" }}
                >
                  <span
                    className="text-3xl font-medium text-[#C4956A]"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    LG
                  </span>
                </div>
                <div>
                  <h3
                    className="text-2xl font-semibold text-[#1A1A1A] mb-1"
                    style={{ fontFamily: "var(--font-manrope)" }}
                  >
                    Lucas Gil González
                  </h3>
                  <p className="text-[#C4956A] font-medium mb-4">
                    El que responde los emails, el que programa, y el que se
                    levanta a las 3am cuando se cae el servidor.
                  </p>
                  <div className="space-y-4 text-[#5A5A5A] leading-relaxed">
                    <p>
                      Empecé esto porque vi a mi hermana, a amigos, a gente que
                      quiero, pasar horas escribiendo notas en lugar de descansar
                      o estar con su familia. Pensé: &ldquo;Esto lo puede hacer una
                      máquina, y la máquina no se cansa.&rdquo;
                    </p>
                    <p>
                      No vengo del mundo de las startups. Vengo de construir
                      cosas con ordenadores. Y de escuchar a la gente que usa
                      esas cosas.
                    </p>
                    <p>
                      Ahora mismo soy yo solo, con ayuda de un par de psicólogos
                      que me dicen cuando algo no tiene sentido clínico. Y
                      buscando a alguien que quiera apostar conmigo.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3 text-sm">
                    <a
                      href="mailto:lucasgilgon@gmail.com"
                      className="inline-flex items-center px-4 py-2 bg-[#FFFFFF] text-[#0B1F2E] border border-[#E0DCD7] hover:border-[#C4956A] hover:text-[#C4956A] transition-colors"
                      style={{ borderRadius: "10px" }}
                    >
                      lucasgilgon@gmail.com
                    </a>
                    <span
                      className="inline-flex items-center px-4 py-2 bg-[#FFFFFF] text-[#5A5A5A] border border-[#E0DCD7]"
                      style={{ borderRadius: "10px" }}
                    >
                      666 627 415
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
