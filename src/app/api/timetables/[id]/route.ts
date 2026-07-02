import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const timetable = await db.timetable.findUnique({
    where: { id },
    include: {
      class: true,
      slots: {
        include: { teacher: true, subject: true, class: true, room: true },
        orderBy: [{ day: "asc" }, { period: "asc" }],
      },
    },
  })
  if (!timetable) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(timetable)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.timetable.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
