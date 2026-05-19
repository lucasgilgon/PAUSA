"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-12 bg-[#0B1F2E] border-t border-[#1A3A4F]">
      <div className="landing-container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <svg
              width="28"
              height="18"
              viewBox="0 0 520 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M60 160C60 130,90 110,110 130C130 150,120 185,100 190C75 196,55 175,65 150C75 125,105 115,125 135C145 155,140 190,120 200C95 212,68 195,72 170C76 145,108 130,128 148C148 166,142 198,122 208C100 220,72 205,68 180C64 155,92 138,115 148C140 160,145 193,132 210C152 200,170 185,175 165C182 148,220 148,260 155C300 162,340 158,390 158C440 158,490 158,510 158"
                stroke="#C4956A"
                strokeWidth="28"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span
              className="font-bold text-lg text-[#B8C4CC]"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              Pausa
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-[#B8C4CC]">
            <a href="#producto" className="text-[#C4956A] hover:text-[#FFFFFF] transition-colors">
              Producto
            </a>
            <a href="#tecnologia" className="text-[#C4956A] hover:text-[#FFFFFF] transition-colors">
              Tecnología
            </a>
            <a href="#inversion" className="text-[#C4956A] hover:text-[#FFFFFF] transition-colors">
              Inversión
            </a>
            <a href="#contacto" className="text-[#C4956A] hover:text-[#FFFFFF] transition-colors">
              Contacto
            </a>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1 text-sm text-[#B8C4CC]">
            <a
              href="mailto:lucasgilgon@gmail.com"
              className="text-[#C4956A] hover:text-[#FFFFFF] transition-colors"
            >
              lucasgilgon@gmail.com
            </a>
            <span className="text-[#C4956A]">666 627 415</span>
            <span suppressHydrationWarning>&copy; {new Date().getFullYear()} PAUSA. Todos los derechos
            reservados.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
