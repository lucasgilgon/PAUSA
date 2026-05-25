"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

export default function ContactSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    type: "",
    message: "",
  });

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

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "El nombre es obligatorio";
    if (!form.email.trim()) {
      newErrors.email = "El email es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Introduce un email válido";
    }
    if (!form.type) newErrors.type = "Selecciona un tipo de interés";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        triggerShake();
        alert("Error al enviar. Por favor, intenta de nuevo.");
      }
    } catch {
      triggerShake();
      alert("Error al enviar. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <section id="contacto" className="landing-section bg-[#F7F5F2]">
      <div className="landing-container">
        <div ref={ref} className={`reveal max-w-3xl mx-auto ${visible ? "visible" : ""}`}>
          {/* Tarjeta de visita */}
          <div className="border border-[#E0DCD7] bg-[#FFFFFF] p-10 md:p-16 text-center mb-12" style={{ borderRadius: "12px" }}>
            <div className="landing-label mb-6">Contacto</div>
            <h2 className="landing-h2 mb-10">Hablemos.</h2>

            <div className="space-y-4">
              <a
                href="mailto:lucasgilgon@gmail.com"
                className="block text-[48px] leading-[1.1] text-[#0B1F2E] hover:text-[#C4956A] transition-colors"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                lucasgilgon@gmail.com
              </a>
              <a
                href="tel:+34666627415"
                className="block text-[48px] leading-[1.1] text-[#0B1F2E] hover:text-[#C4956A] transition-colors"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                666 627 415
              </a>
            </div>
          </div>

          {submitted ? (
            <div className="p-10 bg-[#E8F5EE] border border-[#2D6A4F]/20 text-center" style={{ borderRadius: "12px" }}>
              <CheckCircle className="w-12 h-12 text-[#2D6A4F] mx-auto mb-4" />
              <h3
                className="text-xl font-semibold text-[#2D6A4F] mb-2"
                style={{ fontFamily: "var(--font-manrope)" }}
              >
                Mensaje enviado
              </h3>
              <p className="text-[#5A5A5A]">
                Gracias. Te escribo yo personalmente en cuanto lo vea.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <a href="#producto" className="text-sm text-[#0B1F2E] underline">
                  Ver cómo funciona PAUSA
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-sm text-[#0B1F2E] underline">
                  Seguir en LinkedIn
                </a>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className={`p-8 md:p-10 bg-[#FFFFFF] border border-[#E0DCD7] space-y-5 ${shake ? "shake-error" : ""}`}
              style={{ borderRadius: "12px" }}
            >
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Nombre completo *
                  </label>
                  <input
                    id="nombre"
                    required
                    type="text"
                    className={`w-full px-4 py-3 bg-[#F7F5F2] border text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none input-glow transition-all ${errors.name ? "border-[#a83836]" : "border-[#E0DCD7]"}`}
                    style={{ borderRadius: "10px" }}
                    placeholder="Tu nombre"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                  {errors.name && (
                    <p className="text-xs text-[#a83836] mt-1">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Email *
                  </label>
                  <input
                    id="email"
                    required
                    type="email"
                    className={`w-full px-4 py-3 bg-[#F7F5F2] border text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none input-glow transition-all ${errors.email ? "border-[#a83836]" : "border-[#E0DCD7]"}`}
                    style={{ borderRadius: "10px" }}
                    placeholder="tu@email.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                  {errors.email && (
                    <p className="text-xs text-[#a83836] mt-1">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="telefono" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Teléfono
                  </label>
                  <input
                    id="telefono"
                    type="tel"
                    className="w-full px-4 py-3 bg-[#F7F5F2] border border-[#E0DCD7] text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none input-glow transition-all"
                    style={{ borderRadius: "10px" }}
                    placeholder="+34 600 000 000"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="tipo" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Tipo de interés *
                  </label>
                  <select
                    id="tipo"
                    required
                    className={`w-full px-4 py-3 bg-[#F7F5F2] border text-[#1A1A1A] focus:outline-none input-glow transition-all appearance-none ${errors.type ? "border-[#a83836]" : "border-[#E0DCD7]"}`}
                    style={{ borderRadius: "10px", backgroundImage: "none" }}
                    value={form.type}
                    onChange={(e) =>
                      setForm({ ...form, type: e.target.value })
                    }
                  >
                    <option value="">Selecciona...</option>
                    <option value="public_funding">Capital Público / Subvenciones</option>
                    <option value="private_equity">Private Equity / Venture Capital</option>
                    <option value="business_angel">Business Angel / Particular</option>
                    <option value="institutional">Partnership Institucional</option>
                    <option value="psychologist">Soy psicólogo y quiero probarlo</option>
                    <option value="other">Otro</option>
                  </select>
                  {errors.type && (
                    <p className="text-xs text-[#a83836] mt-1">{errors.type}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="mensaje" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Mensaje
                </label>
                <textarea
                  id="mensaje"
                  rows={4}
                  className="w-full px-4 py-3 bg-[#F7F5F2] border border-[#E0DCD7] text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none input-glow transition-all resize-none"
                  style={{ borderRadius: "10px" }}
                  placeholder="Cuéntanos quién eres y por qué te interesa esto. No hace falta que suene a email corporativo."
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-8 py-4 bg-[#0B1F2E] text-white text-sm font-semibold tracking-[0.15em] uppercase hover:bg-[#1A3A4F] btn-elegant disabled:opacity-60 transition-all"
                style={{ borderRadius: "12px" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar"
                )}
              </button>

              <p className="text-xs text-[#8A8A8A] text-center">
                Los datos se tratan conforme al RGPD. Nunca compartimos tu
                información con terceros.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
