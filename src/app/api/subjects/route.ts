import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#14b8a6", "#06b6d4", "#8b5cf6", "#ec4899", "#f43f5e"]

export async function GET() {
  const subjects = await db.subject.findMany({
    orderBy: { name: "asc" },
    include: { assignments: true },
  })
  return NextResponse.json(subjects)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const color = body.color || COLORS[Math.floor(Math.random() * COLORS.length)]
  const subject = await db.subject.create({
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
      color,
    },
  })
  return NextResponse.json(subject, { status: 201 })
}
