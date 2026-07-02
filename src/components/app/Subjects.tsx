"use client"

import { useState, useEffect } from "react"
import { api, type Subject } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, FlaskConical, BookOpen, Users, Upload } from "lucide-react"
import { CsvUploadDialog } from "./CsvUploadDialog"
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

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
  "#14b8a6", "#06b6d4", "#8b5cf6", "#ec4899", "#f43f5e",
  "#3b82f6", "#0ea5e9", "#a855f7", "#6366f1",
]

const SESSION_TYPES = [
  { value: "theory", label: "Theory (Lecture)" },
  { value: "lab", label: "Lab (Practical)" },
  { value: "tutorial", label: "Tutorial" },
]
const ROOM_TYPES = [
  { value: "lecture", label: "Lecture Hall" },
  { value: "lab", label: "Wet Lab" },
  { value: "computer", label: "Computer Lab" },
  { value: "seminar", label: "Seminar Room" },
]

export function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Subject | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const load = () => {
    setLoading(true)
    api.subjects.list()
      .then(setSubjects)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Courses / Subjects</h2>
          <p className="text-sm text-muted-foreground">Define courses with credits, weekly hours, session type, and required room</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Bulk Import
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Course
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Color</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Wkly Hrs</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Room Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: s.color || "#888" }} />
                    </TableCell>
                    <TableCell className="font-mono font-medium">{s.code}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.department || "—"}</TableCell>
                    <TableCell><span className="font-semibold">{s.credits}</span></TableCell>
                    <TableCell>{s.weeklyHours}h</TableCell>
                    <TableCell>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        s.difficulty === "hard" ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                        s.difficulty === "medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {s.difficulty}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.sessionType === "lab" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400">
                          <FlaskConical className="h-3 w-3" /> Lab
                        </span>
                      ) : s.sessionType === "tutorial" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400">
                          <Users className="h-3 w-3" /> Tutorial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <BookOpen className="h-3 w-3" /> Theory
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.requiresRoomType || "any"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setDialogOpen(true) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                      No courses found. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SubjectDialog open={dialogOpen} onOpenChange={setDialogOpen} subject={editing} onSaved={() => { load(); setDialogOpen(false) }} />

      <CsvUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        type="subjects"
        onUploaded={() => load()}
      />

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              All related assignments and timetable slots will be cleared. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await api.subjects.remove(deleteId!)
                  toast.success("Course deleted")
                  load()
                } catch (e: any) { toast.error(e.message) }
                finally { setDeleteId(null) }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SubjectDialog({ open, onOpenChange, subject, onSaved }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  subject: Subject | null
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: "", code: "", department: "", credits: 4, weeklyHours: 3, durationMinutes: 50,
    difficulty: "medium", sessionType: "theory", requiresRoomType: "lecture", color: COLORS[0],
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (subject) {
      setForm({
        name: subject.name, code: subject.code, department: subject.department || "",
        credits: subject.credits, weeklyHours: subject.weeklyHours, durationMinutes: subject.durationMinutes,
        difficulty: subject.difficulty, sessionType: subject.sessionType,
        requiresRoomType: subject.requiresRoomType || "lecture",
        color: subject.color || COLORS[0],
      })
    } else {
      setForm({
        name: "", code: "", department: "", credits: 4, weeklyHours: 3, durationMinutes: 50,
        difficulty: "medium", sessionType: "theory", requiresRoomType: "lecture",
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      })
    }
  }, [subject, open])

  const submit = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error("Name and code are required"); return }
    setSaving(true)
    try {
      if (subject) {
        await api.subjects.update(subject.id, form)
        toast.success("Course updated")
      } else {
        await api.subjects.create(form)
        toast.success("Course added")
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{subject ? "Edit Course" : "Add New Course"}</DialogTitle>
          <DialogDescription>
            Weekly hours drive how many periods the scheduler allocates. Credits track academic load. Lab sessions use two consecutive periods.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label><span className="text-destructive">*</span> Course Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Data Structures & Algorithms" />
            </div>
            <div className="grid gap-2">
              <Label><span className="text-destructive">*</span> Course Code</Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CS201" className="font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Department</Label>
              <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="CSE" />
            </div>
            <div className="grid gap-2">
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy (afternoon ok)</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard (morning preferred)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Credits</Label>
              <Input type="number" min={1} max={8} value={form.credits} onChange={e => setForm({ ...form, credits: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>Weekly Hours</Label>
              <Input type="number" min={1} max={10} value={form.weeklyHours} onChange={e => setForm({ ...form, weeklyHours: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>Duration (min)</Label>
              <Input type="number" min={30} max={120} step={5} value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Session Type</Label>
              <Select value={form.sessionType} onValueChange={v => {
                const isLab = v === "lab"
                setForm({ ...form, sessionType: v, durationMinutes: isLab ? 100 : 50, requiresRoomType: isLab ? (form.requiresRoomType === "lecture" ? "computer" : form.requiresRoomType) : form.requiresRoomType })
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Required Room Type</Label>
              <Select value={form.requiresRoomType} onValueChange={v => setForm({ ...form, requiresRoomType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Color (for timetable display)</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-7 w-7 rounded-full border-2 transition ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : subject ? "Save Changes" : "Add Course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
