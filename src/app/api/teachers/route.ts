import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const teachers = await db.teacher.findMany({
    orderBy: { name: "asc" },
    include: {
      assignments: {
        include: { subject: true, class: true },
      },
      availability: true,
    },
  })
  return NextResponse.json(teachers)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const teacher = await db.teacher.create({
    data: {
      name: body.name,
      email: body.email || null,
      department: body.department || null,
      employeeId: body.employeeId || null,
      designation: body.designation || null,
      maxHoursPerWeek: Number(body.maxHoursPerWeek ?? 16),
      minHoursPerWeek: Number(body.minHoursPerWeek ?? 8),
    },
  })
  return NextResponse.json(teacher, { status: 201 })
}
