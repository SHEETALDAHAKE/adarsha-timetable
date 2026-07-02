"use client"

import { useState, useEffect } from "react"
import { api, type WorkloadAnalytics } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { Users, BookOpen, GraduationCap, DoorOpen, TrendingUp, Sparkles, Database, Award, Layers } from "lucide-react"
import { toast } from "sonner"

type Props = {
  onNavigate: (tab: string) => void
  refreshKey: number
}

export function Dashboard({ onNavigate, refreshKey }: Props) {
  const [data, setData] = useState<WorkloadAnalytics | null>(null)
  const [fetchedKey, setFetchedKey] = useState<number>(-1)
  const loading = fetchedKey !== refreshKey

  useEffect(() => {
    let active = true
    api.analytics.workload()
      .then(d => { if (active) { setData(d); setFetchedKey(refreshKey) } })
      .catch(e => toast.error(e.message))
    return () => { active = false }
  }, [refreshKey])

  if (loading) return <DashboardSkeleton />
  if (!data) return <div>Failed to load analytics.</div>

  const teacherChartData = data.teachers.map(t => ({
    name: t.teacherName.length > 14 ? t.teacherName.slice(0, 13) + "…" : t.teacherName,
    fullName: t.teacherName,
    utilization: t.utilization,
    assigned: t.assignedHours,
    max: t.maxHoursPerWeek,
    status: t.status,
  }))

  const classChartData = data.classLoad.map(c => ({
    name: c.className.length > 18 ? c.className.slice(0, 17) + "…" : c.className,
    fullName: c.className,
    hours: c.totalWeeklyHours,
    credits: c.totalCredits,
    subjects: c.subjectCount,
  }))

  const subjectPieData = data.subjectDist.map(s => ({
    name: s.subjectCode,
    value: s.totalWeeklyHours,
    color: s.color || "#888",
  }))

  const programChartData = data.programDist.map(p => ({
    name: p.program,
    classes: p.classes,
    students: p.students,
    hours: p.weeklyHours,
  }))

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">College Overview</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Scientific College Timetable Dashboard</h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Real-time view of faculty workload, credit distribution, room utilization, and program coverage.
                The constraint-based scheduler respects faculty availability, matches lab courses to lab rooms,
                and prevents conflicts across sections, faculty, and rooms.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onNavigate("generate")} className="gap-2">
                <Sparkles className="h-4 w-4" /> Generate Timetable
              </Button>
              <Button variant="outline" onClick={() => onNavigate("assignments")} className="gap-2">
                Manage Assignments
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Faculty"
          value={data.summary.totalTeachers}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          subtitle={`${data.summary.overloadedTeachers} over · ${data.summary.underloadedTeachers} under`}
        />
        <StatCard
          icon={<GraduationCap className="h-5 w-5" />}
          label="Sections"
          value={data.summary.totalClasses}
          accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          subtitle="Across programs"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Courses"
          value={data.summary.totalSubjects}
          accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          subtitle="Theory + labs"
        />
        <StatCard
          icon={<DoorOpen className="h-5 w-5" />}
          label="Rooms"
          value={data.summary.totalRooms}
          accent="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          subtitle="Lecture + labs"
        />
        <StatCard
          icon={<Award className="h-5 w-5" />}
          label="Total Credits"
          value={data.summary.totalCredits}
          accent="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          subtitle="Across sections"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Avg Utilization"
          value={`${data.summary.avgUtilization}%`}
          accent="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
          subtitle="Faculty workload"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Faculty Workload Utilization</CardTitle>
            <CardDescription>Assigned hours vs maximum weekly capacity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={teacherChartData} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload
                    return (
                      <div className="rounded-lg border bg-background p-3 text-xs shadow-lg">
                        <p className="font-semibold">{p.fullName}</p>
                        <p className="text-muted-foreground">Assigned: <b>{p.assigned}h</b> / Max: <b>{p.max}h</b></p>
                        <p className="text-muted-foreground">Utilization: <b>{p.utilization}%</b></p>
                        <Badge variant={p.status === "over" ? "destructive" : p.status === "under" ? "secondary" : "default"} className="mt-1">
                          {p.status === "over" ? "Overloaded" : p.status === "under" ? "Underloaded" : "Balanced"}
                        </Badge>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
                  {teacherChartData.map((d, i) => (
                    <Cell key={i} fill={d.status === "over" ? "#ef4444" : d.status === "under" ? "#f59e0b" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course Hours Distribution</CardTitle>
            <CardDescription>Total weekly hours per course across all sections</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={subjectPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={50} label={(e: any) => `${e.name}`}>
                  {subjectPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Program Distribution</CardTitle>
            <CardDescription>Sections, students, and weekly hours per academic program</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={programChartData} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="classes" name="Sections" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="students" name="Students" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Section Load Overview</CardTitle>
            <CardDescription>Weekly hours and credits per section</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={classChartData} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload
                    return (
                      <div className="rounded-lg border bg-background p-3 text-xs shadow-lg">
                        <p className="font-semibold">{p.fullName}</p>
                        <p className="text-muted-foreground">{p.hours}h/week · {p.credits} credits · {p.subjects} courses</p>
                      </div>
                    )
                  }}
                />
                <Legend />
                <Bar dataKey="hours" name="Weekly Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="credits" name="Credits" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Faculty workload table */}
      <Card>
        <CardHeader>
          <CardTitle>Faculty Workload Detail</CardTitle>
          <CardDescription>Each faculty member&apos;s assignments, hours, credits, and load status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Faculty</th>
                  <th className="py-2 pr-4 font-medium">Designation</th>
                  <th className="py-2 pr-4 font-medium">Department</th>
                  <th className="py-2 pr-4 font-medium">Hours</th>
                  <th className="py-2 pr-4 font-medium">Credits</th>
                  <th className="py-2 pr-4 font-medium w-40">Utilization</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Courses</th>
                </tr>
              </thead>
              <tbody>
                {data.teachers.map(t => (
                  <tr key={t.teacherId} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{t.teacherName}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{t.designation || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{t.department || "—"}</td>
                    <td className="py-3 pr-4">
                      <span className="font-medium">{t.assignedHours}h</span>
                      <span className="text-muted-foreground"> / {t.maxHoursPerWeek}h</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium">{t.assignedCredits}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(100, t.utilization)} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-10 text-right">{t.utilization}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={t.status === "over" ? "destructive" : t.status === "under" ? "secondary" : "default"}>
                        {t.status === "over" ? "Overloaded" : t.status === "under" ? "Underloaded" : "Balanced"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {t.subjects.slice(0, 3).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {s.code} · {s.className.split(" ").slice(-1)[0]}
                          </Badge>
                        ))}
                        {t.subjects.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{t.subjects.length - 3}</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {data.teachers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No faculty yet. Click below to load college demo data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data.teachers.length === 0 && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  try {
                    await api.seed()
                    toast.success("College demo data loaded!")
                    onNavigate("dashboard")
                  } catch (e: any) { toast.error(e.message) }
                }}
              >
                <Database className="h-4 w-4" /> Load College Demo Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room utilization */}
      {data.roomUtilization.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Layers className="h-4 w-4" /> Room Utilization (latest timetable)</CardTitle>
            <CardDescription>Slots booked per room in the most recently generated timetable</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Room</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Capacity</th>
                    <th className="py-2 pr-4 font-medium">Booked Slots</th>
                  </tr>
                </thead>
                <tbody>
                  {data.roomUtilization.map(r => (
                    <tr key={r.roomId} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{r.roomName}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs">{r.roomType}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{r.capacity}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={r.bookedSlots > 0 ? "default" : "secondary"} className="text-xs">
                          {r.bookedSlots} slot(s)
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, accent, subtitle }: {
  icon: React.ReactNode
  label: string
  value: string | number
  accent: string
  subtitle?: string
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="h-24 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <div className="h-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-64 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
