/**
 * app/patients/new/page.tsx
 * Página de creación de paciente — pasa datos al formulario cliente.
 */

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NewPatientForm } from "@/components/patients/NewPatientForm";

export const metadata: Metadata = { title: "Nuevo paciente" };

export default async function NewPatientPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");
  return <NewPatientForm />;
}
