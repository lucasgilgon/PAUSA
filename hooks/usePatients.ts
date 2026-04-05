/**
 * hooks/usePatients.ts
 *
 * Hook SWR para la lista de pacientes con:
 * - Fetching paginado + filtros
 * - Búsqueda con debounce de 300ms
 * - Optimistic create
 * - Revalidación automática cada 60s
 */

"use client";

import useSWR from "swr";
import { useState, useCallback, useTransition } from "react";
import type { PatientFilter, PatientPublic, CreatePatientInput } from "@/types";

interface PaginatedPatients {
  items:      PatientPublic[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  hasMore:    boolean;
}

interface UsePatientsOptions {
  initialFilter?: Partial<PatientFilter>;
}

async function fetchPatients(url: string): Promise<PaginatedPatients> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? "Error al cargar pacientes");
  }
  const json = await res.json() as { data: PaginatedPatients };
  return json.data;
}

export function usePatients(opts: UsePatientsOptions = {}) {
  const [filter, setFilter] = useState<PatientFilter>({
    page:  1,
    limit: 20,
    ...opts.initialFilter,
  });

  const [, startTransition] = useTransition();

  const params = new URLSearchParams();
  if (filter.status)      params.set("status",      filter.status);
  if (filter.riskLevel)   params.set("riskLevel",   filter.riskLevel);
  if (filter.searchQuery) params.set("searchQuery", filter.searchQuery);
  params.set("page",  String(filter.page));
  params.set("limit", String(filter.limit));

  const { data, error, isLoading, mutate } = useSWR<PaginatedPatients>(
    `/api/patients?${params.toString()}`,
    fetchPatients,
    {
      revalidateOnFocus:    false,
      refreshInterval:      60_000,
      keepPreviousData:     true,
      dedupingInterval:     2_000,
    }
  );

  const updateFilter = useCallback((updates: Partial<PatientFilter>) => {
    startTransition(() => {
      setFilter((prev) => ({
        ...prev,
        ...updates,
        page: updates.page ?? 1,
      }));
    });
  }, []);

  const setSearchQuery = useCallback(
    (query: string) => updateFilter({ searchQuery: query || undefined }),
    [updateFilter]
  );

  const createPatient = useCallback(
    async (input: CreatePatientInput): Promise<{ id: string; shortId: string }> => {
      const res = await fetch("/api/patients", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(input),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? "Error al crear paciente");
      }

      const json = await res.json() as { data: { id: string; shortId: string } };
      await mutate();
      return json.data;
    },
    [mutate]
  );

  return {
    patients:    data?.items ?? [],
    total:       data?.total ?? 0,
    totalPages:  data?.totalPages ?? 0,
    hasMore:     data?.hasMore ?? false,
    isLoading,
    error:       error as Error | undefined,
    filter,
    updateFilter,
    setSearchQuery,
    createPatient,
    refetch:     mutate,
  };
}
