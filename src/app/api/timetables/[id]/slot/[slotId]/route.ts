import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; slotId: string }> }) {
  const { slotId } = await params
  const body = await req.json()
  const updated = await db.timetableSlot.update({ where: { id: slotId }, data: { subjectId: body.subjectId || null, teacherId: body.teacherId || null, roomId: body.roomId || null } })
  return NextResponse.json(updated)
}
