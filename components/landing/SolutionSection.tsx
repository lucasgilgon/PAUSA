"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, FileText, Shield, Brain } from "lucide-react";

const steps = [
  {
    icon: Mic,
    step: "01",
    title: "Graba la sesión",
    desc: "Das al botón en el navegador. Nada de instalar programas raros ni pedir permisos extraños.",
  },
  {
    icon: Brain,
    step: "02",
    title: "Transcribe con diarización",
    desc: "Separa quién habla: tú de un lado, el paciente del otro. Todo procesado dentro de la UE.",
  },
  {
    icon: FileText,
    step: "03",
    title: "Genera nota clínica IA",
    desc: "La IA local redacta la nota en formato SOAP, DAP, BIRP o GIRP. Tú la revisas, la retocas y listo.",
  },
  {
    icon: Shield,
    step: "04",
    title: "Detecta riesgo y protege",
    desc: "Si detecta algo grave, te avisa. El audio se borra. Los datos se cifran. Punto.",
  },
];

export default function SolutionSection() {
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
    <section id="solucion" className="landing-section bg-[#FFFFFF]">
      <div className="landing-container">
        <div ref={ref} className={`reveal ${visible ? "visible" : ""}`}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="landing-label mb-4">La solución</div>
            <h2
              className="landing-h2 mb-6"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              De la grabación a la nota clínica en{" "}
              <span className="text-[#C4956A]">cuatro pasos</span>.
            </h2>
            <p className="landing-body-text">
              Un flujo que diseñé escuchando a psicólogos reales. Sin
              configuraciones raras, sin enviar datos a ningún servidor de
              California.
            </p>
          </div>

          {/* Mockup placeholder */}
          <div className="max-w-4xl mx-auto mb-16">
            <div
              className="w-full aspect-[16/9] bg-[#F7F5F2] border border-[#E0DCD7] flex items-center justify-center relative overflow-hidden"
              style={{ borderRadius: "12px" }}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-[#E0DCD7] rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText size={28} className="text-[#8A8A8A]" />
                </div>
                <p className="text-sm text-[#8A8A8A] font-medium">
                  Screenshot del producto próximamente
                </p>
                <p className="text-xs text-[#8A8A8A] mt-1">
                  Interfaz real de PAUSA en uso
                </p>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-4 left-4 right-4 h-8 bg-[#FFFFFF] border border-[#E0DCD7] flex items-center px-3 gap-2" style={{ borderRadius: "8px" }}>
                <div className="w-3 h-3 rounded-full bg-[#E0DCD7]" />
                <div className="w-3 h-3 rounded-full bg-[#E0DCD7]" />
                <div className="w-3 h-3 rounded-full bg-[#E0DCD7]" />
                <div className="flex-1 h-4 bg-[#F7F5F2] ml-2" style={{ borderRadius: "4px" }} />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 reveal-stagger">
            {steps.map((s, i) => (
              <div
                key={s.step}
                className="group p-8 bg-[#F7F5F2] border border-[#E0DCD7] card-lift hover:border-[#C4956A]/40 cursor-default"
                style={{ borderRadius: "12px", transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-[#F0EDE8] flex items-center justify-center card-icon-vibrant text-[#0B1F2E]" style={{ borderRadius: "10px" }}>
                    <s.icon size={22} strokeWidth={2} />
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ fontFamily: "var(--font-playfair)", color: "#C4956A" }}
                  >
                    {s.step}
                  </span>
                </div>
                <h3
                  className="landing-h3 mb-3 text-lg"
                  style={{ fontFamily: "var(--font-manrope)", fontWeight: 600 }}
                >
                  {s.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-[#5A5A5A]">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <a
              href="#contacto"
              className="inline-flex items-center justify-center px-10 py-4 bg-[#0B1F2E] text-white text-base font-semibold hover:bg-[#1A3A4F] btn-elegant"
              style={{ borderRadius: "12px" }}
            >
              Probar PAUSA gratis — 14 días
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
