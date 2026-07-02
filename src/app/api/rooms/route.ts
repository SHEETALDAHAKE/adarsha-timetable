import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const rooms = await db.room.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: { _count: { select: { slots: true } } },
  })
  return NextResponse.json(rooms)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const room = await db.room.create({
    data: {
      name: body.name,
      type: body.type || "lecture",
      capacity: Number(body.capacity ?? 60),
      building: body.building || null,
      floor: body.floor || null,
    },
  })
  return NextResponse.json(room, { status: 201 })
}
