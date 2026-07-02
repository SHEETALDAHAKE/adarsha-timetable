import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const room = await db.room.findUnique({ where: { id } })
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(room)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const room = await db.room.update({
    where: { id },
    data: {
      name: body.name,
      type: body.type || "lecture",
      capacity: Number(body.capacity ?? 60),
      building: body.building || null,
      floor: body.floor || null,
    },
  })
  return NextResponse.json(room)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.room.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
