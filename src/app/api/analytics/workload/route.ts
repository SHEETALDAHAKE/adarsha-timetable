import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const assignments = await db.teacherAssignment.findMany({
    include: { teacher: true, subject: true, class: true },
  })

  const teachersMap: Record<string, {
    teacherId: string
    teacherName: string
    department: string | null
    designation: string | null
    maxHoursPerWeek: number
    minHoursPerWeek: number
    assignedHours: number
    assignedCredits: number
    subjects: { code: string; name: string; weeklyHours: number; credits: number; className: string }[]
  }> = {}

  for (const a of assignments) {
    if (!teachersMap[a.teacherId]) {
      teachersMap[a.teacherId] = {
        teacherId: a.teacherId,
        teacherName: a.teacher.name,
        department: a.teacher.department,
        designation: a.teacher.designation,
        maxHoursPerWeek: a.teacher.maxHoursPerWeek,
        minHoursPerWeek: a.teacher.minHoursPerWeek,
        assignedHours: 0,
        assignedCredits: 0,
        subjects: [],
      }
    }
    teachersMap[a.teacherId].assignedHours += a.subject.weeklyHours
    teachersMap[a.teacherId].assignedCredits += a.subject.credits
    teachersMap[a.teacherId].subjects.push({
      code: a.subject.code,
      name: a.subject.name,
      weeklyHours: a.subject.weeklyHours,
      credits: a.subject.credits,
      className: a.class.name,
    })
  }

  const teachers = Object.values(teachersMap).map(t => {
    const utilization = t.maxHoursPerWeek > 0 ? Math.round((t.assignedHours / t.maxHoursPerWeek) * 100) : 0
    let status: "under" | "ok" | "over" = "ok"
    if (t.assignedHours < t.minHoursPerWeek) status = "under"
    else if (t.assignedHours > t.maxHoursPerWeek) status = "over"
    return { ...t, utilization, status }
  })

  // Class load
  const classes = await db.class.findMany({
    include: { assignments: { include: { subject: true } } },
    orderBy: [{ program: "asc" }, { year: "asc" }, { section: "asc" }],
  })
  const classLoad = classes.map(c => ({
    classId: c.id,
    className: c.name,
    program: c.program,
    year: c.year,
    semester: c.semester,
    section: c.section,
    totalWeeklyHours: c.assignments.reduce((sum, a) => sum + a.subject.weeklyHours, 0),
    totalCredits: c.assignments.reduce((sum, a) => sum + a.subject.credits, 0),
    subjectCount: c.assignments.length,
  }))

  // Subject distribution
  const subjects = await db.subject.findMany({
    include: { assignments: { include: { class: true } } },
  })
  const subjectDist = subjects.map(s => ({
    subjectId: s.id,
    subjectCode: s.code,
    subjectName: s.name,
    color: s.color,
    sessionType: s.sessionType,
    totalClasses: s.assignments.length,
    totalWeeklyHours: s.assignments.length * s.weeklyHours,
    totalCredits: s.assignments.length * s.credits,
  }))

  // Program distribution
  const programMap: Record<string, { program: string; classes: number; students: number; weeklyHours: number }> = {}
  for (const c of classes) {
    if (!programMap[c.program]) {
      programMap[c.program] = { program: c.program, classes: 0, students: 0, weeklyHours: 0 }
    }
    programMap[c.program].classes += 1
    programMap[c.program].students += c.capacity
    programMap[c.program].weeklyHours += c.assignments.reduce((sum, a) => sum + a.subject.weeklyHours, 0)
  }
  const programDist = Object.values(programMap)

  // Room utilization — count slots per room from latest timetable
  const latestTimetable = await db.timetable.findFirst({
    orderBy: { createdAt: "desc" },
    include: { slots: true },
  })
  const rooms = await db.room.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] })
  const roomUtilization = rooms.map(r => ({
    roomId: r.id,
    roomName: r.name,
    roomType: r.type,
    capacity: r.capacity,
    bookedSlots: latestTimetable?.slots.filter(s => s.roomId === r.id).length ?? 0,
  }))

  // Summary
  const totalTeachers = teachers.length
  const totalClasses = classLoad.length
  const totalSubjects = subjects.length
  const totalRooms = rooms.length
  const totalAssignments = assignments.length
  const overloadedTeachers = teachers.filter(t => t.status === "over").length
  const underloadedTeachers = teachers.filter(t => t.status === "under").length
  const avgUtilization = totalTeachers > 0
    ? Math.round(teachers.reduce((s, t) => s + t.utilization, 0) / totalTeachers)
    : 0
  const totalCredits = classLoad.reduce((s, c) => s + c.totalCredits, 0)

  return NextResponse.json({
    teachers,
    classLoad,
    subjectDist,
    roomUtilization,
    programDist,
    summary: {
      totalTeachers,
      totalClasses,
      totalSubjects,
      totalRooms,
      totalAssignments,
      overloadedTeachers,
      underloadedTeachers,
      avgUtilization,
      totalCredits,
    },
  })
}
