import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST() {
  try {
    await db.timetableSlot.deleteMany()
    await db.timetable.deleteMany()
    await db.teacherAvailability.deleteMany()
    await db.teacherAssignment.deleteMany()
    await db.teacher.deleteMany()
    await db.subject.deleteMany()
    await db.class.deleteMany()
    await db.room.deleteMany()

    // ===== ROOMS =====
    const rooms = await Promise.all([
      db.room.create({ data: { name: "LH-101", type: "lecture", capacity: 120, building: "Academic Block A", floor: "1st" } }),
      db.room.create({ data: { name: "LH-102", type: "lecture", capacity: 120, building: "Academic Block A", floor: "1st" } }),
      db.room.create({ data: { name: "LH-201", type: "lecture", capacity: 80, building: "Academic Block A", floor: "2nd" } }),
      db.room.create({ data: { name: "LH-202", type: "lecture", capacity: 80, building: "Academic Block A", floor: "2nd" } }),
      db.room.create({ data: { name: "CS-LAB-1", type: "computer", capacity: 60, building: "CS Block", floor: "Ground" } }),
      db.room.create({ data: { name: "CS-LAB-2", type: "computer", capacity: 60, building: "CS Block", floor: "Ground" } }),
      db.room.create({ data: { name: "ECE-LAB-1", type: "lab", capacity: 40, building: "ECE Block", floor: "1st" } }),
      db.room.create({ data: { name: "PHY-LAB", type: "lab", capacity: 40, building: "Science Block", floor: "2nd" } }),
      db.room.create({ data: { name: "CHEM-LAB", type: "lab", capacity: 40, building: "Science Block", floor: "2nd" } }),
      db.room.create({ data: { name: "SEM-1", type: "seminar", capacity: 50, building: "Academic Block A", floor: "3rd" } }),
    ])

    // ===== TEACHERS =====
    const teachers = await Promise.all([
      db.teacher.create({ data: { name: "Dr. Anjali Verma", email: "anjali.verma@college.edu", department: "Computer Science & Engineering", employeeId: "PROF-001", designation: "Professor", maxHoursPerWeek: 14, minHoursPerWeek: 8 } }),
      db.teacher.create({ data: { name: "Dr. Rajesh Kumar", email: "rajesh.kumar@college.edu", department: "Electronics & Communication", employeeId: "PROF-002", designation: "Professor", maxHoursPerWeek: 14, minHoursPerWeek: 8 } }),
      db.teacher.create({ data: { name: "Dr. Priya Sharma", email: "priya.sharma@college.edu", department: "Mathematics", employeeId: "PROF-003", designation: "Associate Professor", maxHoursPerWeek: 16, minHoursPerWeek: 10 } }),
      db.teacher.create({ data: { name: "Dr. Imran Khan", email: "imran.khan@college.edu", department: "Mechanical Engineering", employeeId: "PROF-004", designation: "Associate Professor", maxHoursPerWeek: 16, minHoursPerWeek: 10 } }),
      db.teacher.create({ data: { name: "Dr. Sunita Rao", email: "sunita.rao@college.edu", department: "Physics", employeeId: "PROF-005", designation: "Professor", maxHoursPerWeek: 14, minHoursPerWeek: 8 } }),
      db.teacher.create({ data: { name: "Prof. Arjun Mehta", email: "arjun.mehta@college.edu", department: "Computer Science & Engineering", employeeId: "PROF-006", designation: "Assistant Professor", maxHoursPerWeek: 18, minHoursPerWeek: 12 } }),
      db.teacher.create({ data: { name: "Prof. Neha Gupta", email: "neha.gupta@college.edu", department: "Humanities & Social Sciences", employeeId: "PROF-007", designation: "Assistant Professor", maxHoursPerWeek: 18, minHoursPerWeek: 12 } }),
      db.teacher.create({ data: { name: "Prof. Vikram Singh", email: "vikram.singh@college.edu", department: "Chemistry", employeeId: "PROF-008", designation: "Assistant Professor", maxHoursPerWeek: 18, minHoursPerWeek: 12 } }),
      db.teacher.create({ data: { name: "Dr. Meera Iyer", email: "meera.iyer@college.edu", department: "Computer Science & Engineering", employeeId: "PROF-009", designation: "Associate Professor", maxHoursPerWeek: 14, minHoursPerWeek: 8 } }),
      db.teacher.create({ data: { name: "Prof. Karan Patel", email: "karan.patel@college.edu", department: "Electronics & Communication", employeeId: "PROF-010", designation: "Assistant Professor", maxHoursPerWeek: 18, minHoursPerWeek: 12 } }),
    ])

    // ===== SUBJECTS (college courses with credits) =====
    const subjects = await Promise.all([
      // CSE subjects
      db.subject.create({ data: { name: "Data Structures & Algorithms", code: "CS201", department: "CSE", credits: 4, weeklyHours: 4, durationMinutes: 50, difficulty: "hard", sessionType: "theory", requiresRoomType: "lecture", color: "#ef4444" } }),
      db.subject.create({ data: { name: "Object Oriented Programming", code: "CS202", department: "CSE", credits: 4, weeklyHours: 4, durationMinutes: 50, difficulty: "medium", sessionType: "theory", requiresRoomType: "lecture", color: "#f97316" } }),
      db.subject.create({ data: { name: "DBMS Lab", code: "CS203L", department: "CSE", credits: 2, weeklyHours: 4, durationMinutes: 100, difficulty: "medium", sessionType: "lab", requiresRoomType: "computer", color: "#0ea5e9" } }),
      db.subject.create({ data: { name: "Operating Systems", code: "CS301", department: "CSE", credits: 4, weeklyHours: 4, durationMinutes: 50, difficulty: "hard", sessionType: "theory", requiresRoomType: "lecture", color: "#84cc16" } }),
      db.subject.create({ data: { name: "Computer Networks", code: "CS302", department: "CSE", credits: 3, weeklyHours: 3, durationMinutes: 50, difficulty: "medium", sessionType: "theory", requiresRoomType: "lecture", color: "#10b981" } }),
      // ECE subjects
      db.subject.create({ data: { name: "Digital Signal Processing", code: "EC301", department: "ECE", credits: 4, weeklyHours: 4, durationMinutes: 50, difficulty: "hard", sessionType: "theory", requiresRoomType: "lecture", color: "#8b5cf6" } }),
      db.subject.create({ data: { name: "Microprocessors", code: "EC302", department: "ECE", credits: 3, weeklyHours: 3, durationMinutes: 50, difficulty: "hard", sessionType: "theory", requiresRoomType: "lecture", color: "#ec4899" } }),
      db.subject.create({ data: { name: "Electronics Lab", code: "EC303L", department: "ECE", credits: 2, weeklyHours: 4, durationMinutes: 100, difficulty: "medium", sessionType: "lab", requiresRoomType: "lab", color: "#06b6d4" } }),
      // Common subjects
      db.subject.create({ data: { name: "Engineering Mathematics III", code: "MA201", department: "Mathematics", credits: 4, weeklyHours: 4, durationMinutes: 50, difficulty: "hard", sessionType: "theory", requiresRoomType: "lecture", color: "#f59e0b" } }),
      db.subject.create({ data: { name: "Engineering Physics", code: "PH101", department: "Physics", credits: 3, weeklyHours: 3, durationMinutes: 50, difficulty: "medium", sessionType: "theory", requiresRoomType: "lecture", color: "#a855f7" } }),
      db.subject.create({ data: { name: "Physics Lab", code: "PH101L", department: "Physics", credits: 1, weeklyHours: 2, durationMinutes: 100, difficulty: "easy", sessionType: "lab", requiresRoomType: "lab", color: "#6366f1" } }),
      db.subject.create({ data: { name: "Engineering Chemistry", code: "CH101", department: "Chemistry", credits: 3, weeklyHours: 3, durationMinutes: 50, difficulty: "medium", sessionType: "theory", requiresRoomType: "lecture", color: "#14b8a6" } }),
      db.subject.create({ data: { name: "Technical Communication", code: "HU201", department: "Humanities", credits: 2, weeklyHours: 2, durationMinutes: 50, difficulty: "easy", sessionType: "tutorial", requiresRoomType: "seminar", color: "#f43f5e" } }),
      db.subject.create({ data: { name: "Thermodynamics", code: "ME201", department: "Mechanical", credits: 3, weeklyHours: 3, durationMinutes: 50, difficulty: "hard", sessionType: "theory", requiresRoomType: "lecture", color: "#7c3aed" } }),
    ])

    // ===== CLASSES (college sections) =====
    const classes = await Promise.all([
      db.class.create({ data: { name: "B.Tech CSE Sem-3 Sec-A", program: "B.Tech", department: "Computer Science & Engineering", year: 2, semester: 1, section: "A", capacity: 60, room: "LH-201" } }),
      db.class.create({ data: { name: "B.Tech CSE Sem-3 Sec-B", program: "B.Tech", department: "Computer Science & Engineering", year: 2, semester: 1, section: "B", capacity: 60, room: "LH-202" } }),
      db.class.create({ data: { name: "B.Tech ECE Sem-5 Sec-A", program: "B.Tech", department: "Electronics & Communication", year: 3, semester: 1, section: "A", capacity: 55, room: "LH-101" } }),
      db.class.create({ data: { name: "B.Tech CSE Sem-5 Sec-A", program: "B.Tech", department: "Computer Science & Engineering", year: 3, semester: 1, section: "A", capacity: 60, room: "LH-102" } }),
    ])

    // ===== ASSIGNMENTS =====
    // CSE Sem-3 Sec-A: DSA, OOP, DBMS Lab, Math-III, Physics, Physics Lab, Tech Comm
    const assign = (ti: number, si: number, ci: number) =>
      db.teacherAssignment.create({
        data: { teacherId: teachers[ti].id, subjectId: subjects[si].id, classId: classes[ci].id },
      })

    // Class 0: B.Tech CSE Sem-3 Sec-A
    await assign(0, 0, 0)  // Dr. Anjali → DSA
    await assign(5, 1, 0)  // Prof. Arjun → OOP
    await assign(8, 2, 0)  // Dr. Meera → DBMS Lab
    await assign(2, 8, 0)  // Dr. Priya → Math-III
    await assign(4, 9, 0)  // Dr. Sunita → Physics
    await assign(4, 10, 0) // Dr. Sunita → Physics Lab
    await assign(6, 12, 0) // Prof. Neha → Tech Comm

    // Class 1: B.Tech CSE Sem-3 Sec-B
    await assign(0, 0, 1)  // Dr. Anjali → DSA
    await assign(5, 1, 1)  // Prof. Arjun → OOP
    await assign(8, 2, 1)  // Dr. Meera → DBMS Lab
    await assign(2, 8, 1)  // Dr. Priya → Math-III
    await assign(4, 9, 1)  // Dr. Sunita → Physics
    await assign(4, 10, 1) // Dr. Sunita → Physics Lab
    await assign(6, 12, 1) // Prof. Neha → Tech Comm

    // Class 2: B.Tech ECE Sem-5 Sec-A
    await assign(1, 5, 2)  // Dr. Rajesh → DSP
    await assign(9, 6, 2)  // Prof. Karan → Microprocessors
    await assign(1, 7, 2)  // Dr. Rajesh → Electronics Lab
    await assign(2, 8, 2)  // Dr. Priya → Math-III
    await assign(3, 13, 2) // Dr. Imran → Thermodynamics
    await assign(6, 12, 2) // Prof. Neha → Tech Comm

    // Class 3: B.Tech CSE Sem-5 Sec-A
    await assign(0, 3, 3)  // Dr. Anjali → OS
    await assign(5, 4, 3)  // Prof. Arjun → CN
    await assign(8, 2, 3)  // Dr. Meera → DBMS Lab
    await assign(2, 8, 3)  // Dr. Priya → Math-III
    await assign(6, 12, 3) // Prof. Neha → Tech Comm

    // ===== TEACHER AVAILABILITY =====
    // Dr. Anjali — Research block on Monday P1, P2
    await db.teacherAvailability.createMany({
      data: [
        { teacherId: teachers[0].id, day: "monday", period: 1, reason: "Research" },
        { teacherId: teachers[0].id, day: "monday", period: 2, reason: "Research" },
      ],
    })
    // Dr. Rajesh — Office hours Wednesday P6, P7
    await db.teacherAvailability.createMany({
      data: [
        { teacherId: teachers[1].id, day: "wednesday", period: 6, reason: "Office hours" },
        { teacherId: teachers[1].id, day: "wednesday", period: 7, reason: "Office hours" },
      ],
    })
    // Dr. Priya — Friday afternoon off
    await db.teacherAvailability.createMany({
      data: [
        { teacherId: teachers[2].id, day: "friday", period: 7, reason: "Leave" },
        { teacherId: teachers[2].id, day: "friday", period: 8, reason: "Leave" },
      ],
    })

    return NextResponse.json({
      ok: true,
      message: "College demo data inserted: 10 teachers, 14 subjects, 4 classes, 10 rooms, 28 assignments, 6 availability blocks",
    })
  } catch (e: any) {
    console.error("[seed] error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
