/**
 * components/patients/PatientsClient.tsx
 *
 * Client Component interactivo de la bóveda de pacientes.
 * Props: initialPatients (hidrata desde SSR, evita skeleton).
 *
 * Features:
 * - Búsqueda por nombre/ID con debounce 300ms
 * - Filtros por estado (activo/pausa/alta) y riesgo
 * - Badge AES-256 en cada tarjeta
 * - Alerta visual para pacientes de riesgo alto/crítico
 */

"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Lock, AlertTriangle, ChevronRight, Plus, UserX } from "lucide-react";
import { cn, formatRelativeTime, riskToLabel, isHighRisk } from "@/lib/utils";
import type { PatientPublic, PatientStatus } from "@/types";

interface PatientsClientProps {
  initialPatients: PatientPublic[];
}

const STATUS_FILTERS: { value: PatientStatus | "all"; label: string }[] = [
  { value: "all",        label: "Todos" },
  { value: "active",     label: "Activos" },
  { value: "paused",     label: "En pausa" },
  { value: "discharged", label: "Alta" },
];

export function PatientsClient({ initialPatients }: PatientsClientProps) {
  const [search,        setSearch]        = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter,  setStatusFilter]  = useState<PatientStatus | "all">("all");
  const [riskOnly,      setRiskOnly]      = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce de búsqueda 300ms
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // Filtrado local (los datos ya están en cliente desde SSR)
  const filtered = useMemo(() => {
    return initialPatients.filter((p) => {
      const matchSearch = !debouncedSearch ||
        p.displayName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.shortId.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchRisk   = !riskOnly || isHighRisk(p.currentRisk);

      return matchSearch && matchStatus && matchRisk;
    });
  }, [initialPatients, debouncedSearch, statusFilter, riskOnly]);

  const riskCount = initialPatients.filter((p) => isHighRisk(p.currentRisk)).length;

  return (
    <div className="flex flex-col">
      {/* ── Barra de búsqueda ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre o ID..."
            className="input pl-9 text-sm"
            aria-label="Buscar paciente"
          />
        </div>
      </div>

      {/* ── Chips de filtro ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={cn(
              "badge whitespace-nowrap transition-colors",
              statusFilter === value
                ? "bg-primary text-white border-transparent"
                : "bg-surface-secondary text-text-secondary border border-border"
            )}
          >
            {label}
            {value === "all" && ` (${initialPatients.length})`}
          </button>
        ))}

        {/* Filtro de riesgo */}
        {riskCount > 0 && (
          <button
            onClick={() => setRiskOnly((v) => !v)}
            className={cn(
              "badge whitespace-nowrap transition-colors",
              riskOnly
                ? "bg-error text-white border-transparent"
                : "bg-error/10 text-error border border-error/20"
            )}
          >
            <AlertTriangle size={10} />
            Riesgo ({riskCount})
          </button>
        )}
      </div>

      {/* ── Lista de pacientes ───────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState hasSearch={!!debouncedSearch} />
      ) : (
        <div className="flex flex-col">
          {filtered.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      )}

      {/* ── FAB — Añadir paciente ─────────────────────────────────────── */}
      <Link
        href="/patients/new"
        className="fixed bottom-20 right-4 z-raised
                   w-12 h-12 rounded-full bg-primary text-white shadow-md
                   flex items-center justify-center
                   hover:bg-primary-700 active:scale-95 transition-all"
        aria-label="Añadir paciente"
      >
        <Plus size={22} strokeWidth={2.5} />
      </Link>
    </div>
  );
}

// ─── PatientCard ──────────────────────────────────────────────────────────

function PatientCard({ patient }: { patient: PatientPublic }) {
  const highRisk = isHighRisk(patient.currentRisk);

  const avatarClass = highRisk
    ? "patient-avatar patient-avatar--risk"
    : patient.isAnonymized
      ? "patient-avatar patient-avatar--anon"
      : "patient-avatar patient-avatar--default";

  const statusLabels: Record<string, string> = {
    active:     "Activo",
    paused:     "En pausa",
    discharged: "Alta",
    archived:   "Archivado",
  };

  const statusBadgeClass: Record<string, string> = {
    active:     "badge-active",
    paused:     "badge-neutral",
    discharged: "badge-neutral",
    archived:   "badge-neutral",
  };

  return (
    <Link
      href={`/patients/${patient.id}`}
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b border-border",
        "hover:bg-surface-secondary transition-colors",
        highRisk && "bg-error/3 border-l-2 border-l-error"
      )}
    >
      {/* Avatar */}
      <div className={avatarClass}>
        {patient.initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "text-sm font-semibold truncate",
              highRisk ? "text-error" : "text-text-primary"
            )}
          >
            {highRisk && <AlertTriangle size={11} className="inline mr-1 mb-px" />}
            {patient.displayName}
          </p>
        </div>

        <p className="text-xs text-text-tertiary mt-0.5">
          {patient.totalSessions} sesiones
          {patient.lastSessionAt && (
            <> · {formatRelativeTime(patient.lastSessionAt)}</>
          )}
        </p>

        {/* Badge AES-256 — indicador de privacidad */}
        <div className="enc-badge mt-1">
          <Lock size={9} />
          <span>AES-256{patient.isAnonymized ? " · Auto-anon." : ""}</span>
        </div>
      </div>

      {/* Badge estado + chevron */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={cn(
            "badge",
            highRisk
              ? "badge-risk"
              : statusBadgeClass[patient.status] ?? "badge-neutral"
          )}
        >
          {highRisk ? riskToLabel(patient.currentRisk) : statusLabels[patient.status]}
        </span>
        <ChevronRight size={14} className="text-text-tertiary" />
      </div>
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center py-12 px-4 gap-3">
      <div className="w-12 h-12 rounded-full bg-surface-tertiary flex items-center justify-center">
        <UserX size={20} className="text-text-tertiary" />
      </div>
      <p className="text-sm font-medium text-text-secondary text-center">
        {hasSearch
          ? "No se encontraron pacientes con ese criterio"
          : "Todavía no tienes pacientes"}
      </p>
      {!hasSearch && (
        <Link href="/patients/new" className="btn btn-primary btn-sm">
          <Plus size={14} />
          Añadir primer paciente
        </Link>
      )}
    </div>
  );
}
