"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Server, Cpu, Globe, Zap, EyeOff } from "lucide-react";

const techItems = [
  {
    icon: Cpu,
    title: "IA que no sale de casa",
    desc: "Los modelos (Gemma 3) corren en nuestros servidores. Los datos clínicos no salen de ahí. Nunca.",
  },
  {
    icon: Lock,
    title: "Cifrado AES-256-GCM",
    desc: "Todo se cifra antes de guardarse. Si alguien entra en los servidores, encuentra basura.",
  },
  {
    icon: EyeOff,
    title: "Borrado inmediato",
    desc: "El audio se elimina nada más transcribir. De la memoria también. No queda nada.",
  },
  {
    icon: Globe,
    title: "Google Chirp 3 (UE)",
    desc: "La transcripción voz a texto usa servidores europeos de Google. Diarización de dos hablantes. Cumplimiento RGPD.",
  },
  {
    icon: Server,
    title: "Sin dependencias externas",
    desc: "La nota clínica se genera aquí, no en la API de turno. Tú decides dónde están tus datos.",
  },
  {
    icon: Zap,
    title: "Detección de riesgo",
    desc: "Si la conversación revela algo preocupante, la herramienta te avisa al instante. No sustituye tu criterio, pero te cubre las espaldas.",
  },
];

export default function TechSection() {
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
    <section id="tecnologia" className="landing-section bg-[#F7F5F2]">
      <div className="landing-container">
        <div ref={ref} className={`reveal ${visible ? "visible" : ""}`}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="landing-label mb-4">Tecnología</div>
            <h2
              className="landing-h2 mb-6"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              La privacidad no es un añadido. Es el{" "}
              <span className="text-[#C4956A]">cimiento de todo</span>.
            </h2>
            <p className="landing-body-text">
              Cada decisión técnica empezó con la misma pregunta: ¿esto protege
              al paciente? Si la respuesta era no, no entraba.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 reveal-stagger">
            {techItems.map((t, i) => (
              <div
                key={t.title}
                className="group p-8 bg-[#FFFFFF] border border-[#E0DCD7] card-lift hover:bg-[#FFFFFF] cursor-default"
                style={{ borderRadius: "12px", transitionDelay: `${i * 100}ms` }}
              >
                <div className="w-11 h-11 bg-[#F0EDE8] flex items-center justify-center card-icon-vibrant text-[#0B1F2E] mb-5" style={{ borderRadius: "10px" }}>
                  <t.icon size={20} strokeWidth={2} />
                </div>
                <h3
                  className="text-lg font-semibold text-[#1A1A1A] mb-2"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {t.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-[#5A5A5A]">
                  {t.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
