import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const assignments = await db.teacherAssignment.findMany({
    include: { teacher: true, subject: true, class: true },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  })
  return NextResponse.json(assignments)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const assignment = await db.teacherAssignment.create({
    data: {
      teacherId: body.teacherId,
      subjectId: body.subjectId,
      classId: body.classId,
    },
    include: { teacher: true, subject: true, class: true },
  })
  return NextResponse.json(assignment, { status: 201 })
}
