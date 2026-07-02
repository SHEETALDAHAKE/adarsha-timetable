import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teacher = await db.teacher.findUnique({
    where: { id },
    include: {
      assignments: { include: { subject: true, class: true } },
      availability: { orderBy: [{ day: "asc" }, { period: "asc" }] },
    },
  })
  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(teacher)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const teacher = await db.teacher.update({
    where: { id },
    data: {
      name: body.name,
      email: body.email || null,
      department: body.department || null,
      employeeId: body.employeeId || null,
      designation: body.designation || null,
      maxHoursPerWeek: Number(body.maxHoursPerWeek ?? 16),
      minHoursPerWeek: Number(body.minHoursPerWeek ?? 8),
    },
  })
  return NextResponse.json(teacher)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.teacher.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
