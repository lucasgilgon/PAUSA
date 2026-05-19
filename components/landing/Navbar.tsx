"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#producto", label: "Producto" },
    { href: "#tecnologia", label: "Tecnología" },
    { href: "#inversion", label: "Inversión" },
    { href: "#contacto", label: "Contacto" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 navbar-smooth ${
        scrolled
          ? "bg-[#F7F5F2]/90 backdrop-blur-xl border-b border-[#E0DCD7]"
          : "bg-transparent"
      }`}
    >
      <div className="landing-container">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <svg
              width="32"
              height="20"
              viewBox="0 0 520 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M60 160C60 130,90 110,110 130C130 150,120 185,100 190C75 196,55 175,65 150C75 125,105 115,125 135C145 155,140 190,120 200C95 212,68 195,72 170C76 145,108 130,128 148C148 166,142 198,122 208C100 220,72 205,68 180C64 155,92 138,115 148C140 160,145 193,132 210C152 200,170 185,175 165C182 148,220 148,260 155C300 162,340 158,390 158C440 158,490 158,510 158"
                stroke="#0B1F2E"
                strokeWidth="28"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span
              className="font-bold text-xl tracking-tight text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              Pausa
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-[#5A5A5A] hover:text-[#0B1F2E] transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-[#C4956A] after:transition-all after:duration-300 hover:after:w-full"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#contacto"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#0B1F2E] text-white text-[11px] font-semibold uppercase tracking-[0.15em] hover:bg-[#1A3A4F] transition-colors"
              style={{ borderRadius: "0px" }}
            >
              Escríbeme
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <div className="w-6 flex flex-col gap-1.5">
              <span
                className={`block h-0.5 bg-[#1A1A1A] transition-transform ${
                  mobileOpen ? "rotate-45 translate-y-2" : ""
                }`}
              />
              <span
                className={`block h-0.5 bg-[#1A1A1A] transition-opacity ${
                  mobileOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 bg-[#1A1A1A] transition-transform ${
                  mobileOpen ? "-rotate-45 -translate-y-2" : ""
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#F7F5F2] border-t border-[#E0DCD7]">
          <div className="landing-container py-6 flex flex-col gap-4">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-base font-medium text-[#5A5A5A] hover:text-[#0B1F2E]"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <a
              href="#contacto"
              className="mt-2 inline-flex items-center justify-center px-5 py-3 bg-[#0B1F2E] text-white text-sm font-semibold uppercase tracking-[0.15em]"
              style={{ borderRadius: "0px" }}
              onClick={() => setMobileOpen(false)}
            >
              Escríbeme
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
