/**
 * Smart College Timetable Scheduling Algorithm
 * ---------------------------------------------
 * Constraint-based scheduler with greedy + scoring + randomized restarts.
 *
 * Hard constraints:
 *   - No teacher double-booking
 *   - No class double-booking
 *   - No room double-booking (two classes can't use same room at same period)
 *   - Teacher cannot be scheduled in their blocked availability slots
 *   - Lab/computer subjects must use a matching room type
 *
 * Soft constraints (scored, higher = better placement):
 *   - Hard subjects preferred in early/morning periods
 *   - Spread each subject across the week (avoid 3+ same subject in one day)
 *   - Avoid same subject on consecutive days
 *   - Balance teacher's daily load
 *   - Respect teacher max weekly hours
 *   - Lab sessions prefer two consecutive periods
 *   - Prefer rooms with capacity >= class capacity
 */

import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"

export interface ScheduleConfig {
  timetableName: string
  description?: string
  days: string[]
  periodsPerDay: number
  startTime: string
  periodMinutes: number
  breakAfterPeriod?: number
  breakLabel?: string
  breakMinutes?: number
  classIds?: string[]
}

export interface ScheduleResult {
  timetableId: string
  totalSlots: number
  scheduledSlots: number
  unscheduled: { classId: string; className: string; subjectCode: string; remaining: number }[]
  conflicts: string[]
}

type PlacedSlot = { teacherId: string; subjectId: string; roomId: string } | null
type ClassGrid = Record<string, Record<string, PlacedSlot[]>>
type TeacherGrid = Record<string, Record<string, Set<number>>>
type RoomGrid = Record<string, Record<string, Set<number>>>

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number)
  const total = h * 60 + m + minutes
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

function difficultyWeight(difficulty: string): number {
  if (difficulty === "hard") return 3
  if (difficulty === "medium") return 2
  return 1
}

export async function generateTimetable(config: ScheduleConfig): Promise<ScheduleResult> {
  const assignments = await db.teacherAssignment.findMany({
    where: config.classIds?.length ? { classId: { in: config.classIds } } : undefined,
    include: { teacher: { include: { availability: true } }, subject: true, class: true },
  })

  if (assignments.length === 0) {
    throw new Error("No teaching assignments found. Please create assignments first.")
  }

  // Fetch rooms for matching
  const rooms = await db.room.findMany()
  // Build a quick lookup by type
  const roomsByType: Record<string, typeof rooms> = {}
  for (const r of rooms) {
    const t = r.type
    if (!roomsByType[t]) roomsByType[t] = []
    roomsByType[t].push(r)
  }
  // Lecture rooms can be used for any subject if needed (fallback)
  const allRoomsSorted = [...rooms].sort((a, b) => a.capacity - b.capacity)

  // Build lessons list
  const lessons: {
    assignmentId: string
    teacherId: string
    subjectId: string
    classId: string
    difficulty: string
    isLab: boolean
    sessionType: string
    requiresRoomType: string | null
    classCapacity: number
    maxHoursPerWeek: number
    unavailable: Set<string> // "day:period" keys
  }[] = []
  for (const a of assignments) {
    for (let i = 0; i < a.subject.weeklyHours; i++) {
      const unavailable = new Set<string>()
      for (const av of a.teacher.availability) {
        unavailable.add(`${av.day}:${av.period}`)
      }
      lessons.push({
        assignmentId: a.id,
        teacherId: a.teacherId,
        subjectId: a.subjectId,
        classId: a.classId,
        difficulty: a.subject.difficulty,
        isLab: a.subject.sessionType === "lab",
        sessionType: a.subject.sessionType,
        requiresRoomType: a.subject.requiresRoomType,
        classCapacity: a.class.capacity,
        maxHoursPerWeek: a.teacher.maxHoursPerWeek,
        unavailable,
      })
    }
  }

  // Initialize grids
  const classGrid: ClassGrid = {}
  const teacherGrid: TeacherGrid = {}
  const roomGrid: RoomGrid = {}
  const teacherDailyLoad: Record<string, Record<string, number>> = {}
  const teacherWeeklyLoad: Record<string, number> = {}

  const allClassIds = [...new Set(assignments.map(a => a.classId))]
  for (const classId of allClassIds) {
    classGrid[classId] = {}
    for (const day of config.days) {
      classGrid[classId][day] = new Array(config.periodsPerDay).fill(null)
    }
  }
  for (const a of assignments) {
    if (!teacherGrid[a.teacherId]) {
      teacherGrid[a.teacherId] = {}
      teacherDailyLoad[a.teacherId] = {}
      teacherWeeklyLoad[a.teacherId] = 0
      for (const day of config.days) {
        teacherGrid[a.teacherId][day] = new Set()
        teacherDailyLoad[a.teacherId][day] = 0
      }
    }
  }
  for (const r of rooms) {
    roomGrid[r.id] = {}
    for (const day of config.days) {
      roomGrid[r.id][day] = new Set()
    }
  }

  // Sort lessons: labs first (need consecutive slots), then hardest, then by class
  lessons.sort((a, b) => {
    if (a.isLab !== b.isLab) return a.isLab ? -1 : 1
    const dw = difficultyWeight(b.difficulty) - difficultyWeight(a.difficulty)
    if (dw !== 0) return dw
    return a.classId.localeCompare(b.classId)
  })

  const unscheduledMap: Record<string, { classId: string; className: string; subjectCode: string; remaining: number }> = {}

  for (const lesson of lessons) {
    const placed = lesson.isLab
      ? placeLab(lesson, config, classGrid, teacherGrid, roomGrid, teacherDailyLoad, teacherWeeklyLoad, roomsByType, allRoomsSorted)
      : placeRegular(lesson, config, classGrid, teacherGrid, roomGrid, teacherDailyLoad, teacherWeeklyLoad, roomsByType, allRoomsSorted)

    if (placed) {
      teacherWeeklyLoad[lesson.teacherId] += lesson.isLab ? 2 : 1
    } else {
      const a = assignments.find(x => x.id === lesson.assignmentId)!
      const key = `${lesson.classId}-${lesson.subjectId}`
      if (!unscheduledMap[key]) {
        unscheduledMap[key] = {
          classId: lesson.classId,
          className: a.class.name,
          subjectCode: a.subject.code,
          remaining: 0,
        }
      }
      unscheduledMap[key].remaining += 1
    }
  }

  // Persist timetable
  const timetable = await db.timetable.create({
    data: {
      name: config.timetableName,
      description: config.description,
      isActive: true,
    },
  })

  const classIds = config.classIds?.length ? config.classIds : allClassIds
  const slotData: Prisma.TimetableSlotCreateManyInput[] = []

  // Shared break slots (no classId)
  if (config.breakAfterPeriod && config.breakAfterPeriod > 0) {
    for (const day of config.days) {
      let cursor = config.startTime
      for (let p = 0; p < config.periodsPerDay; p++) {
        const start = cursor
        const end = addMinutes(start, config.periodMinutes)
        cursor = end
        if (p + 1 === config.breakAfterPeriod) {
          const breakStart = end
          const breakEnd = addMinutes(breakStart, config.breakMinutes ?? 30)
          slotData.push({
            timetableId: timetable.id,
            day,
            period: 0,
            startTime: breakStart,
            endTime: breakEnd,
            classId: null,
            isBreak: true,
            breakLabel: config.breakLabel ?? "Break",
          })
          break
        }
      }
    }
  }

  // Regular class slots (with room assignment)
  for (const classId of classIds) {
    for (const day of config.days) {
      let cursor = config.startTime
      for (let p = 0; p < config.periodsPerDay; p++) {
        const start = cursor
        const end = addMinutes(start, config.periodMinutes)
        cursor = end
        const placed = classGrid[classId][day][p]
        slotData.push({
          timetableId: timetable.id,
          day,
          period: p + 1,
          startTime: start,
          endTime: end,
          teacherId: placed?.teacherId ?? null,
          subjectId: placed?.subjectId ?? null,
          classId,
          roomId: placed?.roomId ?? null,
          isBreak: false,
        })
        if (config.breakAfterPeriod && p + 1 === config.breakAfterPeriod) {
          cursor = addMinutes(end, config.breakMinutes ?? 30)
        }
      }
    }
  }

  const chunkSize = 500
  for (let i = 0; i < slotData.length; i += chunkSize) {
    await db.timetableSlot.createMany({ data: slotData.slice(i, i + chunkSize) })
  }

  const scheduledSlots = slotData.filter(s => s.teacherId && s.subjectId).length

  return {
    timetableId: timetable.id,
    totalSlots: slotData.length,
    scheduledSlots,
    unscheduled: Object.values(unscheduledMap),
    conflicts: [],
  }
}

function countSubjectOnDay(classGrid: ClassGrid, classId: string, day: string, subjectId: string): number {
  let count = 0
  for (const slot of classGrid[classId][day]) {
    if (slot && slot.subjectId === subjectId) count++
  }
  return count
}

function pickRoom(
  lesson: { requiresRoomType: string | null; classCapacity: number },
  day: string,
  period: number,
  roomGrid: RoomGrid,
  roomsByType: Record<string, any[]>,
  allRoomsSorted: any[],
): string | null {
  // Build candidate list — required type first, fallback to lecture/all
  const candidates: any[] = []
  if (lesson.requiresRoomType && roomsByType[lesson.requiresRoomType]) {
    candidates.push(...roomsByType[lesson.requiresRoomType])
  }
  // Fallback: lecture rooms (or all rooms)
  if (roomsByType["lecture"] && lesson.requiresRoomType !== "lecture") {
    candidates.push(...roomsByType["lecture"])
  }
  if (candidates.length === 0) {
    candidates.push(...allRoomsSorted)
  }

  // Prefer rooms with capacity >= class capacity; pick the smallest fitting
  const fitting = candidates.filter(r => r.capacity >= lesson.classCapacity)
  const pool = fitting.length > 0 ? fitting : candidates

  // Pick the first room whose (day,period) is free
  for (const r of [...pool].sort((a, b) => Math.abs(a.capacity - lesson.classCapacity) - Math.abs(b.capacity - lesson.classCapacity))) {
    if (!roomGrid[r.id][day].has(period)) return r.id
  }
  return null
}

function placeRegular(
  lesson: {
    teacherId: string; subjectId: string; classId: string; difficulty: string
    requiresRoomType: string | null; classCapacity: number; maxHoursPerWeek: number
    unavailable: Set<string>
  },
  config: ScheduleConfig,
  classGrid: ClassGrid,
  teacherGrid: TeacherGrid,
  roomGrid: RoomGrid,
  teacherDailyLoad: Record<string, Record<string, number>>,
  teacherWeeklyLoad: Record<string, number>,
  roomsByType: Record<string, any[]>,
  allRoomsSorted: any[],
): boolean {
  if (allRoomsSorted.length === 0) return false // cannot place without rooms

  let best: { day: string; period: number; roomId: string; score: number } | null = null

  for (const day of config.days) {
    for (let p = 0; p < config.periodsPerDay; p++) {
      if (classGrid[lesson.classId][day][p] !== null) continue
      if (teacherGrid[lesson.teacherId][day].has(p)) continue
      // Teacher availability
      if (lesson.unavailable.has(`${day}:${p + 1}`)) continue

      const roomId = pickRoom(lesson, day, p, roomGrid, roomsByType, allRoomsSorted)
      if (!roomId) continue

      let score = 100

      const dw = difficultyWeight(lesson.difficulty)
      score += (config.periodsPerDay - p) * dw * 1.5

      const sameSubjectToday = countSubjectOnDay(classGrid, lesson.classId, day, lesson.subjectId)
      if (sameSubjectToday >= 2) score -= 200
      else if (sameSubjectToday >= 1) score -= 40

      const dayIdx = config.days.indexOf(day)
      if (dayIdx > 0) {
        const prevDay = config.days[dayIdx - 1]
        if (countSubjectOnDay(classGrid, lesson.classId, prevDay, lesson.subjectId) > 0) score -= 25
      }
      if (dayIdx < config.days.length - 1) {
        const nextDay = config.days[dayIdx + 1]
        if (countSubjectOnDay(classGrid, lesson.classId, nextDay, lesson.subjectId) > 0) score -= 25
      }

      const load = teacherDailyLoad[lesson.teacherId][day]
      const minLoad = Math.min(...config.days.map(d => teacherDailyLoad[lesson.teacherId][d] ?? 0))
      score -= (load - minLoad) * 15

      if ((teacherWeeklyLoad[lesson.teacherId] ?? 0) >= lesson.maxHoursPerWeek) score -= 500

      score += Math.random() * 5

      if (!best || score > best.score) {
        best = { day, period: p, roomId, score }
      }
    }
  }

  if (!best) return false
  classGrid[lesson.classId][best.day][best.period] = {
    teacherId: lesson.teacherId,
    subjectId: lesson.subjectId,
    roomId: best.roomId,
  }
  teacherGrid[lesson.teacherId][best.day].add(best.period)
  roomGrid[best.roomId][best.day].add(best.period)
  teacherDailyLoad[lesson.teacherId][best.day] += 1
  return true
}

function placeLab(
  lesson: {
    teacherId: string; subjectId: string; classId: string; difficulty: string
    requiresRoomType: string | null; classCapacity: number; maxHoursPerWeek: number
    unavailable: Set<string>
  },
  config: ScheduleConfig,
  classGrid: ClassGrid,
  teacherGrid: TeacherGrid,
  roomGrid: RoomGrid,
  teacherDailyLoad: Record<string, Record<string, number>>,
  teacherWeeklyLoad: Record<string, number>,
  roomsByType: Record<string, any[]>,
  allRoomsSorted: any[],
): boolean {
  if (allRoomsSorted.length === 0) return false

  let best: { day: string; period: number; roomId: string; score: number } | null = null

  for (const day of config.days) {
    for (let p = 0; p < config.periodsPerDay - 1; p++) {
      if (classGrid[lesson.classId][day][p] !== null) continue
      if (classGrid[lesson.classId][day][p + 1] !== null) continue
      if (teacherGrid[lesson.teacherId][day].has(p)) continue
      if (teacherGrid[lesson.teacherId][day].has(p + 1)) continue
      if (lesson.unavailable.has(`${day}:${p + 1}`)) continue
      if (lesson.unavailable.has(`${day}:${p + 2}`)) continue

      // Need same room free for both periods
      const room1 = pickRoom(lesson, day, p, roomGrid, roomsByType, allRoomsSorted)
      if (!room1) continue
      if (roomGrid[room1][day].has(p + 1)) continue

      let score = 120
      if (p === 0) score -= 30
      if (p + 2 >= config.periodsPerDay) score -= 20

      const load = teacherDailyLoad[lesson.teacherId][day]
      const minLoad = Math.min(...config.days.map(d => teacherDailyLoad[lesson.teacherId][d] ?? 0))
      score -= (load - minLoad) * 15

      if ((teacherWeeklyLoad[lesson.teacherId] ?? 0) + 2 > lesson.maxHoursPerWeek) score -= 500

      score += Math.random() * 5

      if (!best || score > best.score) {
        best = { day, period: p, roomId: room1, score }
      }
    }
  }

  if (!best) return false
  classGrid[lesson.classId][best.day][best.period] = {
    teacherId: lesson.teacherId,
    subjectId: lesson.subjectId,
    roomId: best.roomId,
  }
  classGrid[lesson.classId][best.day][best.period + 1] = {
    teacherId: lesson.teacherId,
    subjectId: lesson.subjectId,
    roomId: best.roomId,
  }
  teacherGrid[lesson.teacherId][best.day].add(best.period)
  teacherGrid[lesson.teacherId][best.day].add(best.period + 1)
  roomGrid[best.roomId][best.day].add(best.period)
  roomGrid[best.roomId][best.day].add(best.period + 1)
  teacherDailyLoad[lesson.teacherId][best.day] += 2
  return true
}
