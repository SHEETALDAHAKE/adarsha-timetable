import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const slots = await db.teacherAvailability.findMany({
    where: { teacherId: id },
    orderBy: [{ day: "asc" }, { period: "asc" }],
  })
  return NextResponse.json(slots)
}

// Replace all availability slots for a teacher
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const slots: { day: string; period: number; reason?: string }[] = body.slots || []

  await db.$transaction([
    db.teacherAvailability.deleteMany({ where: { teacherId: id } }),
    ...(slots.length > 0
      ? [db.teacherAvailability.createMany({
          data: slots.map(s => ({
            teacherId: id,
            day: s.day,
            period: Number(s.period),
            reason: s.reason || null,
          })),
        })]
      : []),
  ])

  const updated = await db.teacherAvailability.findMany({ where: { teacherId: id } })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.teacherAvailability.deleteMany({ where: { teacherId: id } })
  return NextResponse.json({ ok: true })
}
