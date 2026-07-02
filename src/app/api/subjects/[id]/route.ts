import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const subject = await db.subject.findUnique({
    where: { id },
    include: { assignments: true },
  })
  if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(subject)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const subject = await db.subject.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code,
      department: body.department || null,
      credits: Number(body.credits ?? 4),
      weeklyHours: Number(body.weeklyHours ?? 3),
      durationMinutes: Number(body.durationMinutes ?? 50),
      difficulty: body.difficulty ?? "medium",
      sessionType: body.sessionType ?? "theory",
      requiresRoomType: body.requiresRoomType || null,
      color: body.color || null,
    },
  })
  return NextResponse.json(subject)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.subject.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
