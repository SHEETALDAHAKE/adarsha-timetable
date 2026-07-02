// Shared types and API client helpers

export type Teacher = {
  id: string
  name: string
  email: string | null
  department: string | null
  employeeId: string | null
  designation: string | null
  maxHoursPerWeek: number
  minHoursPerWeek: number
  createdAt: string
  updatedAt: string
  assignments?: TeacherAssignment[]
  availability?: TeacherAvailability[]
}

export type Subject = {
  id: string
  name: string
  code: string
  department: string | null
  credits: number
  weeklyHours: number
  durationMinutes: number
  difficulty: string
  sessionType: string // theory | lab | tutorial
  requiresRoomType: string | null
  color: string | null
  createdAt: string
  updatedAt: string
}

export type ClassInfo = {
  id: string
  name: string
  program: string
  department: string | null
  year: number
  semester: number
  section: string
  capacity: number
  room: string | null
  createdAt: string
  updatedAt: string
}

export type Room = {
  id: string
  name: string
  type: string // lecture | lab | computer | seminar
  capacity: number
  building: string | null
  floor: string | null
  createdAt: string
  updatedAt: string
}

export type TeacherAvailability = {
  id: string
  teacherId: string
  day: string
  period: number
  reason: string | null
  createdAt: string
}

export type TeacherAssignment = {
  id: string
  teacherId: string
  subjectId: string
  classId: string
  teacher?: Teacher
  subject?: Subject
  class?: ClassInfo
}

export type TimetableSlot = {
  id: string
  timetableId: string
  day: string
  period: number
  startTime: string
  endTime: string
  teacherId: string | null
  subjectId: string | null
  classId: string | null
  roomId: string | null
  isBreak: boolean
  breakLabel: string | null
  teacher?: Teacher
  subject?: Subject
  class?: ClassInfo
  room?: Room | null
}

export type Timetable = {
  id: string
  name: string
  classId: string | null
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  class?: ClassInfo | null
  slots?: TimetableSlot[]
  _count?: { slots: number }
}

export type WorkloadAnalytics = {
  teachers: {
    teacherId: string
    teacherName: string
    department: string | null
    designation: string | null
    maxHoursPerWeek: number
    minHoursPerWeek: number
    assignedHours: number
    assignedCredits: number
    utilization: number
    status: "under" | "ok" | "over"
    subjects: { code: string; name: string; weeklyHours: number; credits: number; className: string }[]
  }[]
  classLoad: {
    classId: string
    className: string
    program: string
    year: number
    semester: number
    section: string
    totalWeeklyHours: number
    totalCredits: number
    subjectCount: number
  }[]
  subjectDist: {
    subjectId: string
    subjectCode: string
    subjectName: string
    color: string | null
    sessionType: string
    totalClasses: number
    totalWeeklyHours: number
    totalCredits: number
  }[]
  roomUtilization: {
    roomId: string
    roomName: string
    roomType: string
    capacity: number
    bookedSlots: number
  }[]
  programDist: {
    program: string
    classes: number
    students: number
    weeklyHours: number
  }[]
  summary: {
    totalTeachers: number
    totalClasses: number
    totalSubjects: number
    totalRooms: number
    totalAssignments: number
    overloadedTeachers: number
    underloadedTeachers: number
    avgUtilization: number
    totalCredits: number
  }
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  teachers: {
    list: () => fetchJson("/api/teachers"),
    create: (data: Partial<Teacher>) => fetchJson("/api/teachers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Teacher>) => fetchJson(`/api/teachers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => fetchJson(`/api/teachers/${id}`, { method: "DELETE" }),
    availability: {
      list: (teacherId: string) => fetchJson(`/api/teachers/${teacherId}/availability`),
      set: (teacherId: string, slots: { day: string; period: number; reason?: string }[]) =>
        fetchJson(`/api/teachers/${teacherId}/availability`, { method: "POST", body: JSON.stringify({ slots }) }),
      clear: (teacherId: string) => fetchJson(`/api/teachers/${teacherId}/availability`, { method: "DELETE" }),
    },
  },
  subjects: {
    list: () => fetchJson("/api/subjects"),
    create: (data: Partial<Subject>) => fetchJson("/api/subjects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Subject>) => fetchJson(`/api/subjects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => fetchJson(`/api/subjects/${id}`, { method: "DELETE" }),
  },
  classes: {
    list: () => fetchJson("/api/classes"),
    create: (data: Partial<ClassInfo>) => fetchJson("/api/classes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ClassInfo>) => fetchJson(`/api/classes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => fetchJson(`/api/classes/${id}`, { method: "DELETE" }),
  },
  rooms: {
    list: () => fetchJson("/api/rooms"),
    create: (data: Partial<Room>) => fetchJson("/api/rooms", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Room>) => fetchJson(`/api/rooms/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => fetchJson(`/api/rooms/${id}`, { method: "DELETE" }),
  },
  assignments: {
    list: () => fetchJson("/api/assignments"),
    create: (data: { teacherId: string; subjectId: string; classId: string }) =>
      fetchJson("/api/assignments", { method: "POST", body: JSON.stringify(data) }),
    remove: (id: string) => fetchJson(`/api/assignments/${id}`, { method: "DELETE" }),
  },
  timetables: {
    list: () => fetchJson("/api/timetables"),
    get: (id: string) => fetchJson(`/api/timetables/${id}`),
    remove: (id: string) => fetchJson(`/api/timetables/${id}`, { method: "DELETE" }),
    generate: (config: any) => fetchJson("/api/timetable/generate", { method: "POST", body: JSON.stringify(config) }),
  },
  analytics: {
    workload: () => fetchJson("/api/analytics/workload"),
  },
  upload: {
    teachers: (csv: string) => fetchJson("/api/upload/teachers", { method: "POST", body: JSON.stringify({ csv }) }),
    subjects: (csv: string) => fetchJson("/api/upload/subjects", { method: "POST", body: JSON.stringify({ csv }) }),
    templateUrl: (type: "teachers" | "subjects") => `/api/upload/template?type=${type}`,
  },
  settings: {
    get: () => fetchJson("/api/settings"),
    update: (data: any) => fetchJson("/api/settings", { method: "PUT", body: JSON.stringify(data) }),
  },
  seed: () => fetchJson("/api/seed", { method: "POST" }),
}
