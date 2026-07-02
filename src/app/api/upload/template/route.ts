import { NextRequest, NextResponse } from "next/server"
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "teachers"
  if (type === "teachers") { const csv = "name,email,department,employeeId,designation,maxHoursPerWeek,minHoursPerWeek\nDr. Anjali Verma,anjali@college.edu,CSE,PROF-001,Professor,14,8"; return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="faculty_template.csv"' } }) }
  const csv = "name,code,department,credits,weeklyHours,durationMinutes,difficulty,sessionType,requiresRoomType,batchSize\nData Structures,CS201,CSE,4,4,50,hard,theory,lecture,0"
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="courses_template.csv"' } })
}
