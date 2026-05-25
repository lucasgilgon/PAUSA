"use client";

import { useEffect, useRef, useState } from "react";

export default function InvestmentSection() {
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
      { threshold: 0.08 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="inversion" className="landing-section bg-[#0B1F2E]">
      <div className="landing-container">
        <div ref={ref} className={`reveal ${visible ? "visible" : ""}`}>
          <div className="max-w-3xl">
            <div
              className="mb-4 text-[12px] font-bold uppercase tracking-[2px] text-[#C4956A]"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              BUSCO COMPAÑEROS DE VIAJE
            </div>
            <h2
              className="landing-h2 mb-8 text-white"
              style={{ fontFamily: "var(--font-playfair)", fontWeight: 500 }}
            >
              No vendo acciones.{" "}
              <span className="text-[#C4956A]">Busco aliados</span>.
            </h2>

            <div className="space-y-6 text-lg text-[#B8C4CC] leading-relaxed">
              <p>
                Llevo meses construyendo PAUSA con mis propias manos y con el
                dinero que he podido ahorrar. El producto funciona. Los
                psicólogos que lo han probado me piden cuentas. Pero llega un
                punto en el que una persona sola no puede hacerlo todo.
              </p>
              <p>
                Necesito gente que entienda que esto no es una app más. Es una
                herramienta que puede cambiar el día a día de decenas de miles
                de profesionales. Y que, de paso, puede ser un negocio serio.
              </p>
            </div>

            {/* Los números reales */}
            <div className="mt-12 mb-12">
              <h3
                className="text-lg font-semibold text-white mb-6"
                style={{ fontFamily: "var(--font-manrope)" }}
              >
                Los números reales
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Usuarios activos", value: "12" },
                  { label: "MRR mensual", value: "228€" },
                  { label: "Runway actual", value: "6 meses" },
                  { label: "Ticket buscado", value: "150K€" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(196,149,106,0.25)]"
                    style={{ borderRadius: "10px" }}
                  >
                    <div className="text-2xl font-medium text-[#C4956A] mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
                      {item.value}
                    </div>
                    <div className="text-xs text-[#B8C4CC]">{item.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#8A8A8A] mt-3">
                * Datos actualizados a mayo 2026. Sin adornos.
              </p>
            </div>

            <div className="space-y-6">
              <div
                className="p-6 bg-[rgba(255,255,255,0.03)] border transition-colors duration-300 hover:border-[rgba(196,149,106,0.5)]"
                style={{ borderRadius: "12px", borderColor: "rgba(196,149,106,0.25)" }}
              >
                <h3
                  className="text-lg font-semibold text-white mb-2"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  Si vienes del mundo público o institucional
                </h3>
                <p className="text-[#B8C4CC] leading-relaxed">
                  Sé que existen líneas de Next Generation EU para salud
                  digital, ayudas del CDTI, y fondos regionales para startups de
                  impacto. Si sabes cómo funciona eso mejor que yo, me salvas la
                  vida.
                </p>
              </div>

              <div
                className="p-6 bg-[rgba(255,255,255,0.03)] border transition-colors duration-300 hover:border-[rgba(196,149,106,0.5)]"
                style={{ borderRadius: "12px", borderColor: "rgba(196,149,106,0.25)" }}
              >
                <h3
                  className="text-lg font-semibold text-white mb-2"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  Si eres inversor particular o business angel
                </h3>
                <p className="text-[#B8C4CC] leading-relaxed">
                  No te voy a vender "múltiplos de salida". Te voy a enseñar el
                  código, los números reales, y la lista de psicólogos que ya lo
                  usan. Si te cuadra, hablamos. Si no, también.
                </p>
              </div>

              <div
                className="p-6 bg-[rgba(255,255,255,0.03)] border transition-colors duration-300 hover:border-[rgba(196,149,106,0.5)]"
                style={{ borderRadius: "12px", borderColor: "rgba(196,149,106,0.25)" }}
              >
                <h3
                  className="text-lg font-semibold text-white mb-2"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  Si representas a un colegio, hospital o universidad
                </h3>
                <p className="text-[#B8C4CC] leading-relaxed">
                  Lo que más me ilusiona es que esto llegue a ser una
                  herramienta que los colegios de psicólogos recomienden a sus
                  colegiados. Si crees que tiene sentido, hablemos de un piloto.
                </p>
              </div>
            </div>

            <div className="mt-12">
              <a
                href="#contacto"
                className="inline-flex items-center justify-center px-10 py-4 text-base font-semibold border border-[#C4956A] text-[#C4956A] bg-transparent hover:bg-[#C4956A] hover:text-[#0B1F2E] transition-colors"
                style={{ borderRadius: "12px" }}
              >
                ¿Hablamos?
              </a>
              <p className="text-sm text-[#B8C4CC] mt-4">
                Te preparo un documento con los números reales. Sin florituras.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
