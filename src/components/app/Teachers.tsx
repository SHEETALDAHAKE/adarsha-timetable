"use client"

import { useState, useEffect } from "react"
import { api, type Teacher, type TeacherAvailability } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, Trash2, Search, Mail, Building2, IdCard, Clock, CalendarDays, X, Upload } from "lucide-react"
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

const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat",
}
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

export function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [availabilityTeacher, setAvailabilityTeacher] = useState<Teacher | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const load = () => {
    setLoading(true)
    api.teachers.list()
      .then(setTeachers)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.department?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Faculty</h2>
          <p className="text-sm text-muted-foreground">Manage professor profiles, weekly load, and availability</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Bulk Import
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Faculty
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search faculty…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Emp. ID</TableHead>
                  <TableHead>Hours / week</TableHead>
                  <TableHead>Blocked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{t.designation || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.department || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.employeeId || "—"}</TableCell>
                    <TableCell>
                      <span className="font-medium">{t.minHoursPerWeek}</span>
                      <span className="text-muted-foreground"> – {t.maxHoursPerWeek}h</span>
                    </TableCell>
                    <TableCell>
                      {t.availability && t.availability.length > 0 ? (
                        <Badge variant="secondary" className="text-xs">{t.availability.length} slots</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Edit availability" onClick={() => setAvailabilityTeacher(t)}>
                          <CalendarDays className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setDialogOpen(true) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No faculty found. Click &quot;Add Faculty&quot; to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TeacherDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teacher={editing}
        onSaved={() => { load(); setDialogOpen(false) }}
      />

      <AvailabilityDialog
        teacher={availabilityTeacher}
        onOpenChange={(o) => !o && setAvailabilityTeacher(null)}
        onSaved={() => load()}
      />

      <CsvUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        type="teachers"
        onUploaded={() => load()}
      />

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this faculty member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also delete all their assignments, availability blocks, and clear their timetable slots. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await api.teachers.remove(deleteId!)
                  toast.success("Faculty deleted")
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

const DESIGNATIONS = ["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Visiting Faculty"]

function TeacherDialog({ open, onOpenChange, teacher, onSaved }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  teacher: Teacher | null
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: "", email: "", department: "", employeeId: "", designation: "Assistant Professor",
    maxHoursPerWeek: 16, minHoursPerWeek: 8,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (teacher) {
      setForm({
        name: teacher.name,
        email: teacher.email || "",
        department: teacher.department || "",
        employeeId: teacher.employeeId || "",
        designation: teacher.designation || "Assistant Professor",
        maxHoursPerWeek: teacher.maxHoursPerWeek,
        minHoursPerWeek: teacher.minHoursPerWeek,
      })
    } else {
      setForm({ name: "", email: "", department: "", employeeId: "", designation: "Assistant Professor", maxHoursPerWeek: 16, minHoursPerWeek: 8 })
    }
  }, [teacher, open])

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      if (teacher) {
        await api.teachers.update(teacher.id, form)
        toast.success("Faculty updated")
      } else {
        await api.teachers.create(form)
        toast.success("Faculty added")
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{teacher ? "Edit Faculty" : "Add New Faculty"}</DialogTitle>
          <DialogDescription>
            Enter the faculty member&apos;s details. Max weekly hours drives scheduler load balancing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label><span className="text-destructive">*</span> Full Name</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Dr. Anjali Verma" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="anjali@college.edu" />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><IdCard className="h-3 w-3" /> Employee ID</Label>
              <Input value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} placeholder="PROF-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Department</Label>
              <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Computer Science & Engineering" />
            </div>
            <div className="grid gap-2">
              <Label>Designation</Label>
              <Select value={form.designation} onValueChange={v => setForm({ ...form, designation: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Min hrs/week</Label>
              <Input type="number" min={0} max={30} value={form.minHoursPerWeek} onChange={e => setForm({ ...form, minHoursPerWeek: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Max hrs/week</Label>
              <Input type="number" min={0} max={30} value={form.maxHoursPerWeek} onChange={e => setForm({ ...form, maxHoursPerWeek: Number(e.target.value) })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Scheduler keeps load between <b>{form.minHoursPerWeek}h</b> and <b>{form.maxHoursPerWeek}h</b>. Use the calendar icon next to a teacher to block unavailable slots.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : teacher ? "Save Changes" : "Add Faculty"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== Availability Editor =====
function AvailabilityDialog({ teacher, onOpenChange, onSaved }: {
  teacher: Teacher | null
  onOpenChange: (o: boolean) => void
  onSaved: () => void
}) {
  const [blocked, setBlocked] = useState<Record<string, Set<number>>>({})
  const [periodsPerDay, setPeriodsPerDay] = useState(8)
  const [saving, setSaving] = useState(false)
  const open = !!teacher

  useEffect(() => {
    if (!teacher) return
    // Load availability
    api.teachers.availability.list(teacher.id).then((slots: TeacherAvailability[]) => {
      const map: Record<string, Set<number>> = {}
      for (const d of DAYS) map[d] = new Set()
      for (const s of slots) {
        if (!map[s.day]) map[s.day] = new Set()
        map[s.day].add(s.period)
      }
      setBlocked(map)
    })
  }, [teacher])

  const toggle = (day: string, period: number) => {
    setBlocked(prev => {
      const next = { ...prev }
      if (!next[day]) next[day] = new Set()
      if (next[day].has(period)) next[day].delete(period)
      else next[day].add(period)
      return { ...next }
    })
  }

  const clearAll = () => {
    const cleared: Record<string, Set<number>> = {}
    for (const d of DAYS) cleared[d] = new Set()
    setBlocked(cleared)
  }

  const save = async () => {
    if (!teacher) return
    setSaving(true)
    const slots: { day: string; period: number }[] = []
    for (const d of DAYS) {
      blocked[d]?.forEach(p => slots.push({ day: d, period: p }))
    }
    try {
      await api.teachers.availability.set(teacher.id, slots)
      toast.success(`Saved ${slots.length} blocked slot(s)`)
      onSaved()
      onOpenChange(false)
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  if (!teacher) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Edit Availability — {teacher.name}</DialogTitle>
          <DialogDescription>
            Click cells to toggle blocked periods (research, office hours, leave). The scheduler will never assign this faculty to blocked slots.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{Object.values(blocked).reduce((s, set) => s + set.size, 0)}</span> slot(s) blocked
            </p>
            <Button variant="outline" size="sm" onClick={clearAll} className="gap-2">
              <X className="h-3.5 w-3.5" /> Clear all
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border bg-muted/50 p-2 text-left font-medium text-muted-foreground w-16">Period</th>
                  {DAYS.map(d => (
                    <th key={d} className="border bg-muted/50 p-2 text-center font-semibold">{DAY_LABELS[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map(p => (
                  <tr key={p}>
                    <td className="border bg-muted/30 p-2 text-center text-xs font-medium">P{p}</td>
                    {DAYS.map(d => {
                      const isBlocked = blocked[d]?.has(p)
                      return (
                        <td key={d} className="border p-1 text-center">
                          <button
                            type="button"
                            onClick={() => toggle(d, p)}
                            className={`w-full h-9 rounded text-xs font-medium transition ${
                              isBlocked
                                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                          >
                            {isBlocked ? "✕" : "✓"}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-2 text-xs">
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-emerald-500/30" /> Available</div>
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-destructive" /> Blocked</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Availability"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
