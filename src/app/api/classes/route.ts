import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const classes = await db.class.findMany({
    orderBy: [{ program: "asc" }, { year: "asc" }, { section: "asc" }],
    include: { assignments: true, timetables: true },
  })
  return NextResponse.json(classes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const cls = await db.class.create({
    data: {
      name: body.name,
      program: body.program || "B.Tech",
      department: body.department || null,
      year: Number(body.year ?? 1),
      semester: Number(body.semester ?? 1),
      section: body.section,
      capacity: Number(body.capacity ?? 60),
      room: body.room || null,
    },
  })
  return NextResponse.json(cls, { status: 201 })
}
