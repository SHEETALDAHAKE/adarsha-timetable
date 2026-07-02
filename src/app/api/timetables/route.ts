import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const timetables = await db.timetable.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      class: true,
      _count: { select: { slots: true } },
    },
  })
  return NextResponse.json(timetables)
}
