"use client";

import { useEffect, useState } from "react";

export default function StickyCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollPercent =
        (window.scrollY /
          (document.documentElement.scrollHeight - window.innerHeight)) *
        100;
      setShow(scrollPercent > 30);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0B1F2E]/95 backdrop-blur-md border-t border-[#1A3A4F] transition-transform duration-500 ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="landing-container py-3 flex items-center justify-between gap-4">
        <div className="hidden sm:block">
          <p
            className="text-white text-sm font-semibold"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            Prueba PAUSA gratis durante 14 días
          </p>
          <p className="text-[#B8C4CC] text-xs">
            Sin tarjeta de crédito. Cancela cuando quieras.
          </p>
        </div>
        <a
          href="#contacto"
          className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 bg-[#C4956A] text-[#0B1F2E] text-sm font-semibold hover:bg-[#D4A57A] transition-colors"
          style={{ borderRadius: "10px" }}
        >
          Empezar ahora →
        </a>
      </div>
    </div>
  );
}
