"use client";

import { ShieldCheck, Server, Lock, FileCheck } from "lucide-react";

const badges = [
  {
    icon: ShieldCheck,
    label: "RGPD Compliant",
    desc: "Cumplimiento total",
  },
  {
    icon: Server,
    label: "Servidores UE",
    desc: "Datos en Europa",
  },
  {
    icon: Lock,
    label: "AES-256",
    desc: "Cifrado de grado militar",
  },
  {
    icon: FileCheck,
    label: "Código Deontológico",
    desc: "Revisado por colegiados",
  },
];

export default function TrustBadges() {
  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-6">
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] border border-[#E0DCD7]"
          style={{ borderRadius: "10px" }}
        >
          <badge.icon size={18} className="text-[#C4956A]" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#1A1A1A]">
              {badge.label}
            </span>
            <span className="text-[10px] text-[#8A8A8A]">{badge.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
