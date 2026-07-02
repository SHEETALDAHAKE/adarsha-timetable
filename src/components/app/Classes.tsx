"use client"

import { useState, useEffect } from "react"
import { api, type ClassInfo } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, Users, GraduationCap } from "lucide-react"
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

const PROGRAMS = ["B.Tech", "M.Tech", "BCA", "MCA", "B.Sc", "M.Sc", "B.Com", "B.A", "B.E"]

export function Classes() {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<ClassInfo | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api.classes.list()
      .then(setClasses)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.program.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sections / Classes</h2>
          <p className="text-sm text-muted-foreground">Manage programs, years, semesters, sections, and capacities</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true) }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Section
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search sections…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Default Room</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <GraduationCap className="h-3 w-3" /> {c.program}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.department || "—"}</TableCell>
                    <td className="py-3 pr-4">Year {c.year}</td>
                    <td>Sem {c.semester}</td>
                    <td>{c.section}</td>
                    <td>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" /> {c.capacity}
                      </span>
                    </td>
                    <td className="text-muted-foreground">{c.room || "—"}</td>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setDialogOpen(true) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      No sections found. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ClassDialog open={dialogOpen} onOpenChange={setDialogOpen} cls={editing} onSaved={() => { load(); setDialogOpen(false) }} />

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this section?</AlertDialogTitle>
            <AlertDialogDescription>
              All related assignments, timetables, and slots will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await api.classes.remove(deleteId!)
                  toast.success("Section deleted")
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

function ClassDialog({ open, onOpenChange, cls, onSaved }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  cls: ClassInfo | null
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: "", program: "B.Tech", department: "", year: 1, semester: 1,
    section: "A", capacity: 60, room: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (cls) {
      setForm({
        name: cls.name, program: cls.program, department: cls.department || "",
        year: cls.year, semester: cls.semester, section: cls.section,
        capacity: cls.capacity, room: cls.room || "",
      })
    } else {
      setForm({ name: "", program: "B.Tech", department: "", year: 1, semester: 1, section: "A", capacity: 60, room: "" })
    }
  }, [cls, open])

  // Auto-generate name
  useEffect(() => {
    if (!cls) {
      const sem = (form.year - 1) * 2 + form.semester
      setForm(f => ({ ...f, name: `${f.program} ${f.department ? f.department.split(" ")[0] + " " : ""}Sem-${sem} Sec-${f.section}` }))
    }
  }, [form.program, form.year, form.semester, form.section, form.department, cls])

  const submit = async () => {
    if (!form.name.trim() || !form.program.trim() || !form.section.trim()) {
      toast.error("Name, program and section are required"); return
    }
    setSaving(true)
    try {
      if (cls) {
        await api.classes.update(cls.id, form)
        toast.success("Section updated")
      } else {
        await api.classes.create(form)
        toast.success("Section added")
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{cls ? "Edit Section" : "Add New Section"}</DialogTitle>
          <DialogDescription>
            Define the program, year, semester, and section. The scheduler generates one weekly grid per section.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Program</Label>
              <Select value={form.program} onValueChange={v => setForm({ ...form, program: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Section</Label>
              <Input value={form.section} onChange={e => setForm({ ...form, section: e.target.value.toUpperCase() })} placeholder="A" maxLength={2} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Department</Label>
            <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Computer Science & Engineering" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Year (1-4)</Label>
              <Input type="number" min={1} max={5} value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>Semester (1 or 2)</Label>
              <Input type="number" min={1} max={2} value={form.semester} onChange={e => setForm({ ...form, semester: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Capacity</Label>
              <Input type="number" min={1} max={200} value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>Default Home Room</Label>
              <Input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="LH-201" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Display Name</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <p className="text-xs text-muted-foreground">Auto-generated from program/year/section. Editable.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : cls ? "Save Changes" : "Add Section"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
