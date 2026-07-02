"use client"

import { useState, useEffect } from "react"
import { api, type TeacherAssignment, type Teacher, type Subject, type ClassInfo } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Link2, BookOpen, User, GraduationCap, FlaskConical } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function Assignments() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterProgram, setFilterProgram] = useState<string>("all")

  const load = () => {
    setLoading(true)
    Promise.all([api.assignments.list(), api.teachers.list(), api.subjects.list(), api.classes.list()])
      .then(([a, t, s, c]) => {
        setAssignments(a)
        setTeachers(t)
        setSubjects(s)
        setClasses(c)
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const programs = [...new Set(classes.map(c => c.program))].sort()
  const filtered = filterProgram === "all"
    ? assignments
    : assignments.filter(a => a.class?.program === filterProgram)

  // Group by class
  const byClass: Record<string, TeacherAssignment[]> = {}
  for (const a of filtered) {
    if (!byClass[a.classId]) byClass[a.classId] = []
    byClass[a.classId].push(a)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Teaching Assignments</h2>
          <p className="text-sm text-muted-foreground">Link faculty to courses for each section — this drives the scheduler</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterProgram} onValueChange={setFilterProgram}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by program" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {programs.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              if (teachers.length === 0 || subjects.length === 0 || classes.length === 0) {
                toast.error("Add faculty, courses, and sections first")
                return
              }
              setDialogOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> New Assignment
          </Button>
        </div>
      </div>

      {Object.keys(byClass).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Link2 className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <p>No assignments yet. Create one to link a faculty member to a course for a section.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.filter(c => byClass[c.id]).map(c => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{c.name}</CardTitle>
                    <CardDescription>
                      {c.program} · Year {c.year} · Sem {c.semester} · Sec {c.section} · {c.capacity} seats
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{byClass[c.id].length} courses</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {byClass[c.id].map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border p-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: a.subject?.color || "#888" }}>
                          {a.subject?.code?.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {a.subject?.name}
                            {a.subject?.sessionType === "lab" && (
                              <FlaskConical className="inline h-3 w-3 ml-1 text-violet-500" />
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {a.subject?.code} · {a.teacher?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs">{a.subject?.weeklyHours}h/wk</Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{a.subject?.credits} credits</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(a.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-1 text-xs text-muted-foreground flex justify-between">
                    <span>Total: <b>{byClass[c.id].reduce((s, a) => s + (a.subject?.weeklyHours ?? 0), 0)}h/wk</b></span>
                    <span><b>{byClass[c.id].reduce((s, a) => s + (a.subject?.credits ?? 0), 0)} credits</b></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teachers={teachers}
        subjects={subjects}
        classes={classes}
        existing={assignments}
        onSaved={() => { load(); setDialogOpen(false) }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This faculty member will no longer teach this course to this section. Future timetables will not include it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await api.assignments.remove(deleteId!)
                  toast.success("Assignment removed")
                  load()
                } catch (e: any) { toast.error(e.message) }
                finally { setDeleteId(null) }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AssignmentDialog({ open, onOpenChange, teachers, subjects, classes, existing, onSaved }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  teachers: Teacher[]
  subjects: Subject[]
  classes: ClassInfo[]
  existing: TeacherAssignment[]
  onSaved: () => void
}) {
  const [teacherId, setTeacherId] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const [classId, setClassId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTeacherId(""); setSubjectId(""); setClassId("")
    }
  }, [open])

  const selectedTeacher = teachers.find(t => t.id === teacherId)
  const selectedSubject = subjects.find(s => s.id === subjectId)
  const selectedClass = classes.find(c => c.id === classId)
  const teacherLoad = existing.filter(a => a.teacherId === teacherId).reduce((sum, a) => sum + (a.subject?.weeklyHours ?? 0), 0)
  const teacherMax = selectedTeacher?.maxHoursPerWeek ?? 0
  const newLoad = teacherLoad + (selectedSubject?.weeklyHours ?? 0)
  const overload = newLoad > teacherMax

  const submit = async () => {
    if (!teacherId || !subjectId || !classId) { toast.error("All three fields are required"); return }
    if (overload) {
      toast.warning("Faculty will be over capacity — scheduling may fail")
    }
    setSaving(true)
    try {
      await api.assignments.create({ teacherId, subjectId, classId })
      toast.success("Assignment created")
      onSaved()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>New Teaching Assignment</DialogTitle>
          <DialogDescription>
            Choose a faculty member, course, and section. The scheduler allocates the course&apos;s weekly hours for that section.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Faculty Member</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
              <SelectContent>
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.designation ? `· ${t.designation}` : ""} {t.department ? `· ${t.department}` : ""} · max {t.maxHoursPerWeek}h
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTeacher && (
              <p className="text-xs text-muted-foreground">
                Current load: <b>{teacherLoad}h</b> / max <b>{teacherMax}h</b>
                {selectedSubject && (
                  <span className={overload ? "text-destructive font-medium" : ""}>
                    {" → "}<b>{newLoad}h</b> {overload && "(over capacity!)"}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Course</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.code}) · {s.weeklyHours}h/wk · {s.credits} credits {s.sessionType === "lab" ? "· Lab" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSubject && (
              <p className="text-xs text-muted-foreground">
                {selectedSubject.sessionType.toUpperCase()} · requires <b>{selectedSubject.requiresRoomType || "any"}</b> room · duration {selectedSubject.durationMinutes}min
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Section</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.capacity} seats)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSubject && selectedClass && (
              <p className="text-xs text-muted-foreground">
                Section capacity <b>{selectedClass.capacity}</b> · Course needs <b>{selectedSubject.requiresRoomType || "any"}</b> room
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !teacherId || !subjectId || !classId}>
            {saving ? "Creating…" : "Create Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
