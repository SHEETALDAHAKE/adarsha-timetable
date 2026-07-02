import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cls = await db.class.findUnique({
    where: { id },
    include: { assignments: { include: { teacher: true, subject: true } }, timetables: true },
  })
  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(cls)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const cls = await db.class.update({
    where: { id },
    data: {
      name: body.name,
      program: body.program,
      department: body.department || null,
      year: Number(body.year ?? 1),
      semester: Number(body.semester ?? 1),
      section: body.section,
      capacity: Number(body.capacity ?? 60),
      room: body.room || null,
    },
  })
  return NextResponse.json(cls)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.class.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
