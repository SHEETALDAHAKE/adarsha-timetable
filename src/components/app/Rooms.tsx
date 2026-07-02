"use client"

import { useState, useEffect } from "react"
import { api, type Room } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Search, DoorOpen, Building, Layers } from "lucide-react"
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

const ROOM_TYPES = [
  { value: "lecture", label: "Lecture Hall", icon: "🎓", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { value: "lab", label: "Wet Lab", icon: "🧪", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { value: "computer", label: "Computer Lab", icon: "💻", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { value: "seminar", label: "Seminar Room", icon: "🏛️", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
]

export function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Room | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api.rooms.list()
      .then(setRooms)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase()) ||
    r.building?.toLowerCase().includes(search.toLowerCase())
  )

  // Group by type for stat cards
  const byType = ROOM_TYPES.map(t => ({
    ...t,
    count: rooms.filter(r => r.type === t.value).length,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rooms & Labs</h2>
          <p className="text-sm text-muted-foreground">Manage lecture halls, labs, computer rooms, and seminar spaces</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true) }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Room
        </Button>
      </div>

      {/* Type cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {byType.map(t => (
          <Card key={t.value}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.label}</p>
                  <p className="mt-1 text-2xl font-bold">{t.count}</p>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${t.color} text-lg`}>
                  {t.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search rooms…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const typeInfo = ROOM_TYPES.find(t => t.value === r.type) || ROOM_TYPES[0]
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          <DoorOpen className="h-4 w-4 text-muted-foreground" />
                          {r.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                          {typeInfo.icon} {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.capacity}</TableCell>
                      <TableCell className="text-muted-foreground">{r.building || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.floor || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setDialogOpen(true) }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      No rooms found. Add lecture halls and labs first — the scheduler needs rooms to assign periods.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RoomDialog open={dialogOpen} onOpenChange={setDialogOpen} room={editing} onSaved={() => { load(); setDialogOpen(false) }} />

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this room?</AlertDialogTitle>
            <AlertDialogDescription>
              Timetable slots referencing this room will have their room cleared. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await api.rooms.remove(deleteId!)
                  toast.success("Room deleted")
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

function RoomDialog({ open, onOpenChange, room, onSaved }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  room: Room | null
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: "", type: "lecture", capacity: 60, building: "", floor: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (room) {
      setForm({
        name: room.name, type: room.type, capacity: room.capacity,
        building: room.building || "", floor: room.floor || "",
      })
    } else {
      setForm({ name: "", type: "lecture", capacity: 60, building: "", floor: "" })
    }
  }, [room, open])

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Room name is required"); return }
    setSaving(true)
    try {
      if (room) {
        await api.rooms.update(room.id, form)
        toast.success("Room updated")
      } else {
        await api.rooms.create(form)
        toast.success("Room added")
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{room ? "Edit Room" : "Add New Room"}</DialogTitle>
          <DialogDescription>
            The scheduler matches subject room Type to room Type (lab subjects → lab rooms) and prefers rooms whose capacity fits the section.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label><span className="text-destructive">*</span> Room Name / Code</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="LH-101 / CS-LAB-1" className="font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Capacity</Label>
              <Input type="number" min={5} max={300} value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><Building className="h-3 w-3" /> Building</Label>
              <Input value={form.building} onChange={e => setForm({ ...form, building: e.target.value })} placeholder="Academic Block A" />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><Layers className="h-3 w-3" /> Floor</Label>
              <Input value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="1st / Ground" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : room ? "Save Changes" : "Add Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
