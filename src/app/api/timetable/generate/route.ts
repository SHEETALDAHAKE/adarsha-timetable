import { NextRequest, NextResponse } from "next/server"
import { generateTimetable, type ScheduleConfig } from "@/lib/scheduler"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const config: ScheduleConfig = {
      timetableName: body.timetableName || `Timetable ${new Date().toLocaleDateString()}`,
      description: body.description || "",
      days: body.days || ["monday", "tuesday", "wednesday", "thursday", "friday"],
      periodsPerDay: Number(body.periodsPerDay ?? 8),
      startTime: body.startTime || "09:00",
      periodMinutes: Number(body.periodMinutes ?? 45),
      breakAfterPeriod: body.breakAfterPeriod ? Number(body.breakAfterPeriod) : undefined,
      breakLabel: body.breakLabel || "Lunch Break",
      breakMinutes: body.breakMinutes ? Number(body.breakMinutes) : 30,
      classIds: body.classIds?.length ? body.classIds : undefined,
    }
    const result = await generateTimetable(config)
    return NextResponse.json(result, { status: 201 })
  } catch (e: any) {
    console.error("[timetable/generate] error:", e)
    return NextResponse.json({ error: e.message || "Failed to generate timetable" }, { status: 500 })
  }
}
