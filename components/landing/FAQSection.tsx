"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "¿Es legal grabar una sesión de terapia?",
    answer:
      "Sí, siempre que el paciente dé su consentimiento informado por escrito. PAUSA incluye plantillas de consentimiento adaptadas al código deontológico. El profesional es responsable de obtener y documentar dicho consentimiento.",
  },
  {
    question: "¿El audio realmente se borra después?",
    answer:
      "Sí. El audio se elimina automáticamente nada más generar la transcripción. También se borra de la memoria RAM del servidor. No queda rastro del contenido de la conversación. Solo se conserva la nota clínica generada, cifrada con AES-256.",
  },
  {
    question: "¿Qué pasa si la IA se equivoca?",
    answer:
      "PAUSA genera un borrador de la nota clínica, no un documento definitivo. Tú la revisas, editas y apruebas antes de guardarla. La IA es una herramienta de apoyo, nunca sustituye tu criterio clínico.",
  },
  {
    question: "¿Qué formatos de nota clínica soporta?",
    answer:
      "SOAP, DAP, BIRP y GIRP. Puedes configurar el formato por defecto en tu perfil y cambiarlo para sesiones específicas si lo necesitas. Próximamente añadiremos formatos personalizados.",
  },
  {
    question: "¿Cumple con el RGPD y el código deontológico?",
    answer:
      "Sí. Servidores en Europa (UE), cifrado AES-256-GCM, acceso basado en roles, auditoría de logs, y derecho al olvido. Hemos revisado el diseño con psicólogos colegiados para asegurar el cumplimiento ético.",
  },
  {
    question: "¿Necesito instalar algo?",
    answer:
      "No. PAUSA funciona completamente en el navegador web. Desde tu ordenador, tablet o móvil. Sin descargas, sin permisos extraños, sin complicaciones técnicas.",
  },
  {
    question: "¿Cuánto cuesta y hay prueba gratis?",
    answer:
      "Desde 19€/mes por profesional. Ofrecemos 14 días de prueba gratuita sin necesidad de tarjeta de crédito. Puedes cancelar en cualquier momento.",
  },
];

export default function FAQSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
    <section id="faq" className="landing-section bg-[#F7F5F2]">
      <div className="landing-container">
        <div ref={ref} className={`reveal max-w-3xl mx-auto ${visible ? "visible" : ""}`}>
          <div className="text-center mb-12">
            <div className="landing-label mb-4">Preguntas frecuentes</div>
            <h2
              className="landing-h2 mb-6"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Todo lo que necesitas{" "}
              <span className="text-[#C4956A]">saber</span>.
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-[#FFFFFF] border border-[#E0DCD7] overflow-hidden"
                style={{ borderRadius: "12px" }}
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  aria-expanded={openIndex === i}
                >
                  <span
                    className="text-base font-semibold text-[#1A1A1A] pr-4"
                    style={{ fontFamily: "var(--font-manrope)" }}
                  >
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-[#8A8A8A] flex-shrink-0 transition-transform duration-300 ${
                      openIndex === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: openIndex === i ? "300px" : "0px",
                    opacity: openIndex === i ? 1 : 0,
                  }}
                >
                  <div className="px-5 pb-5 text-[15px] leading-relaxed text-[#5A5A5A]">
                    {faq.answer}
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
