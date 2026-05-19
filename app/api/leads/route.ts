import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, type, message } = body;

    if (!name || !email || !type) {
      return NextResponse.json(
        { error: "Nombre, email y tipo son obligatorios" },
        { status: 400 }
      );
    }

    const lead = await db.investorLead.create({
      data: {
        name,
        email,
        phone: phone || null,
        type,
        message: message || null,
      },
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Error al guardar el contacto" },
      { status: 500 }
    );
  }
}
