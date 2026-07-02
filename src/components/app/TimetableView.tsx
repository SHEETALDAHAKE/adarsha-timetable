"use client"

import { useState, useEffect, useMemo, Fragment, useCallback } from "react"
import {
  api,
  type Timetable,
  type TimetableSlot,
  type Subject,
  type Teacher,
  type Room,
} from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Calendar,
  Download,
  Trash2,
  User,
  Clock,
  MapPin,
  Printer,
  Layers,
  Coffee,
  Grid3x3,
  Pencil,
  Settings,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ===== Constants =====
const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
}

const DAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
}

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

// Print CSS — keeps the timetable printable on A4 / Legal / A3
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .print-area, .print-area * { visibility: visible !important; }
  .print-area { position: absolute !important; left: 0; top: 0; width: 100% !important; }
  .print-size-a4 { width: 190mm !important; }
  .print-size-legal { width: 196mm !important; }
  .print-size-a3 { width: 277mm !important; }
  .print-card { box-shadow: none !important; border: 1px solid #d4d4d4 !important; }
  .print-table { font-size: 9pt !important; }
  .no-print, .no-print * { display: none !important; }
  @page { margin: 10mm; }
}
`

// ===== Types =====
// Extend TimetableSlot with fields that exist on the Prisma model but are
// not declared in the shared type.
type Slot = TimetableSlot & {
  isElective?: boolean
  createdAt?: string
}

type Settings = {
  id?: string
  collegeName: string | null
  department: string | null
  academicYear: string | null
  logoData: string | null
}

type ViewMode = "class" | "teacher" | "combined" | "master" | "edit"
type PrintSize = "a4" | "legal" | "a3"

type Props = {
  selectedId: string | null
  onSelect: (id: string) => void
}

type BreakInfo = { startTime: string; endTime: string; label: string | null }

// ===== Helpers =====

/**
 * Returns a sort order for a class name.
 * B.Com Part I → 1, Part II → 2, Part III → 3.
 * Standalone roman numerals (III, II) and semester-based labels are also recognised.
 * NOTE: "part iii" is checked before "part ii" (and "part ii" before "part i")
 * because the shorter strings are prefixes of the longer ones.
 */
function getOrder(name: string): number {
  const lower = name.toLowerCase()
  if (lower.includes("part iii")) return 3
  if (lower.includes("part ii")) return 2
  if (lower.includes("part i")) return 1
  // Semester checks come BEFORE bare roman numerals because "semester iii"
  // contains the word "iii" (3rd semester = 2nd year → order 2).
  if (/semester\s*v\b/.test(lower) || /semester\s*5\b/.test(lower)) return 3
  if (/semester\s*iii\b/.test(lower) || /semester\s*3\b/.test(lower)) return 2
  if (/\biii\b/.test(lower)) return 3
  if (/\bii\b/.test(lower)) return 2
  return 0
}

function classSort(a: string, b: string): number {
  const oa = getOrder(a)
  const ob = getOrder(b)
  if (oa !== ob) return oa - ob
  return a.localeCompare(b)
}

/** Compact section label, e.g. "B.Com Part II - Section A" → "B.Com IIA" */
function shortClass(
  cls?: { name: string; program: string; year: number; section: string } | null
): string {
  if (!cls) return ""
  const partMatch = cls.name.toLowerCase().match(/part\s+([iv]+)/)
  const partRoman = partMatch ? partMatch[1].toUpperCase() : ""
  if (partRoman) return `${cls.program} ${partRoman}${cls.section}`.trim()
  return `${cls.program} ${cls.year}${cls.section}`.trim()
}

// ===== Main Component =====
export function TimetableView({ selectedId, onSelect }: Props) {
  const [timetables, setTimetables] = useState<Timetable[]>([])
  const [timetable, setTimetable] = useState<Timetable | null>(null)
  const [fetchedId, setFetchedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("class")
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("")
  const [printSize, setPrintSize] = useState<PrintSize>("a4")
  const [settings, setSettings] = useState<Settings | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Subjects / teachers / rooms — used by the Edit dialog
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [rooms, setRooms] = useState<Room[]>([])

  // Load timetables (sorted newest first)
  const loadList = useCallback(() => {
    api.timetables
      .list()
      .then((list: Timetable[]) => {
        const sorted = [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setTimetables(sorted)
      })
      .catch(e => toast.error(e.message))
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  // Load settings + reference data
  useEffect(() => {
    api.settings
      .get()
      .then(s => setSettings(s as Settings))
      .catch(() => {
        /* settings are optional */
      })
    api.subjects.list().then(setSubjects).catch(() => {})
    api.teachers.list().then(setTeachers).catch(() => {})
    api.rooms.list().then(setRooms).catch(() => {})
  }, [])

  // Effective selected id — defaults to the newest timetable
  const effectiveSelectedId =
    selectedId || (timetables.length > 0 ? timetables[0].id : null)
  const loading = !!effectiveSelectedId && fetchedId !== effectiveSelectedId

  // Fetch the active timetable
  useEffect(() => {
    if (!effectiveSelectedId) return
    let active = true
    api.timetables
      .get(effectiveSelectedId)
      .then(t => {
        if (active) {
          setTimetable(t)
          setFetchedId(effectiveSelectedId)
        }
      })
      .catch(e => toast.error(e.message))
    return () => {
      active = false
    }
  }, [effectiveSelectedId])

  const reloadTimetable = useCallback(() => {
    if (!effectiveSelectedId) return
    api.timetables
      .get(effectiveSelectedId)
      .then(setTimetable)
      .catch(e => toast.error(e.message))
  }, [effectiveSelectedId])

  // Unique class & teacher lists from the slots
  const classList = useMemo(() => {
    if (!timetable?.slots) return [] as { id: string; name: string }[]
    const seen = new Map<string, { id: string; name: string }>()
    for (const s of timetable.slots) {
      if (s.classId && s.class) seen.set(s.classId, { id: s.classId, name: s.class.name })
    }
    return [...seen.values()].sort((a, b) => classSort(a.name, b.name))
  }, [timetable])

  const teacherList = useMemo(() => {
    if (!timetable?.slots) return [] as { id: string; name: string }[]
    const seen = new Map<string, { id: string; name: string }>()
    for (const s of timetable.slots) {
      if (s.teacherId && s.teacher) seen.set(s.teacherId, { id: s.teacherId, name: s.teacher.name })
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [timetable])

  const effectiveClassId = selectedClassId || classList[0]?.id || ""
  const effectiveTeacherId = selectedTeacherId || teacherList[0]?.id || ""

  // Period start times — built from ALL non-break slots (including empty ones)
  const periodStartTimes = useMemo(() => {
    const map: Record<number, string> = {}
    if (!timetable?.slots) return map
    for (const s of timetable.slots) {
      if (s.isBreak) continue
      if (!map[s.period]) map[s.period] = s.startTime
    }
    return map
  }, [timetable])

  // Breaks — deduplicated by start time
  const breaks = useMemo<BreakInfo[]>(() => {
    if (!timetable?.slots) return []
    const seen = new Set<string>()
    const result: BreakInfo[] = []
    for (const s of timetable.slots) {
      if (s.isBreak && !seen.has(s.startTime)) {
        seen.add(s.startTime)
        result.push({
          startTime: s.startTime,
          endTime: s.endTime,
          label: s.breakLabel,
        })
      }
    }
    return result
  }, [timetable])

  // Slots filtered for the current single-class / single-teacher view
  const singleViewSlots = useMemo(() => {
    if (!timetable?.slots) return [] as Slot[]
    return timetable.slots.filter(s => {
      if (s.isBreak) return false
      if (viewMode === "class") return s.classId === effectiveClassId
      if (viewMode === "teacher") return s.teacherId === effectiveTeacherId
      return false
    }) as Slot[]
  }, [timetable, viewMode, effectiveClassId, effectiveTeacherId])

  // Slots for the edit view (per-class, like "class" mode)
  const editViewSlots = useMemo(() => {
    if (!timetable?.slots) return [] as Slot[]
    return timetable.slots.filter(s => {
      if (s.isBreak) return false
      return s.classId === effectiveClassId
    }) as Slot[]
  }, [timetable, effectiveClassId])

  // Combined view — one grid per class, sorted B.Com I → II → III
  const combinedGrids = useMemo(() => {
    if (!timetable?.slots) return [] as { classId: string; className: string; slots: Slot[] }[]
    const byClass = new Map<string, Slot[]>()
    for (const s of timetable.slots) {
      if (s.isBreak || !s.classId) continue
      if (!byClass.has(s.classId)) byClass.set(s.classId, [])
      byClass.get(s.classId)!.push(s as Slot)
    }
    const entries = [...byClass.entries()].map(([classId, slots]) => ({
      classId,
      className: slots[0]?.class?.name || classId,
      slots,
    }))
    entries.sort((a, b) => classSort(a.className, b.className))
    return entries
  }, [timetable])

  // Master view — all sections in one grid
  const masterSlots = useMemo(() => {
    if (!timetable?.slots) return [] as Slot[]
    return timetable.slots.filter(s => !s.isBreak) as Slot[]
  }, [timetable])

  // ===== Handlers =====
  const handleDelete = async () => {
    try {
      await api.timetables.remove(deleteId!)
      toast.success("Timetable deleted")
      setDeleteId(null)
      loadList()
      if (selectedId === deleteId) onSelect("")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const exportCSV = () => {
    if (!timetable?.slots) return
    const rows: string[] = []
    rows.push(
      ["Day", "Period", "Start", "End", "Class", "Subject", "Teacher", "Room", "Type"].join(",")
    )
    for (const s of timetable.slots) {
      rows.push(
        [
          s.day,
          s.period,
          s.startTime,
          s.endTime,
          s.class?.name || "",
          s.subject?.name || "",
          s.teacher?.name || "",
          s.room?.name || "",
          s.isBreak ? "Break" : "Class",
        ]
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${timetable.name.replace(/\s+/g, "_")}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Timetable exported as CSV")
  }

  const hasHeader =
    !!settings &&
    (settings.collegeName || settings.department || settings.academicYear || settings.logoData)

  // ===== Render =====
  if (loading) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Loading timetable…
        </CardContent>
      </Card>
    )
  }

  if (timetables.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Calendar className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="mb-2">No timetables generated yet.</p>
          <Button onClick={() => onSelect("")}>Go to Generate</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Toolbar (hidden when printing) */}
      <div className="no-print flex flex-col gap-3 rounded-lg border bg-card p-3 md:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Timetable Viewer</h2>
            <p className="text-sm text-muted-foreground">
              View, print, edit and export generated timetables
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={effectiveSelectedId || ""} onValueChange={onSelect}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select timetable" />
              </SelectTrigger>
              <SelectContent>
                {timetables.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={printSize} onValueChange={v => setPrintSize(v as PrintSize)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="a3">A3</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV} disabled={!timetable}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDeleteId(effectiveSelectedId)}
              disabled={!effectiveSelectedId}
              title="Delete timetable"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              title="College header settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* View mode tabs + secondary filters */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="class" className="gap-1.5">
                <User className="h-3.5 w-3.5" /> By Section
              </TabsTrigger>
              <TabsTrigger value="teacher" className="gap-1.5">
                <User className="h-3.5 w-3.5" /> By Faculty
              </TabsTrigger>
              <TabsTrigger value="combined" className="gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Combined
              </TabsTrigger>
              <TabsTrigger value="master" className="gap-1.5">
                <Grid3x3 className="h-3.5 w-3.5" /> Master
              </TabsTrigger>
              <TabsTrigger value="edit" className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {(viewMode === "class" || viewMode === "edit") && (
            <Select value={effectiveClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {classList.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {viewMode === "teacher" && (
            <Select value={effectiveTeacherId} onValueChange={setSelectedTeacherId}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Select faculty" />
              </SelectTrigger>
              <SelectContent>
                {teacherList.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Print area — only this region is sent to the printer */}
      <div className={cn("print-area space-y-4", `print-size-${printSize}`)}>
        {hasHeader && (
          <CollegeHeader settings={settings!} onEdit={() => setSettingsOpen(true)} />
        )}

        {timetable && (
          <Card className="print-card">
            <CardHeader>
              <div className="flex flex-col gap-1">
                <CardTitle className="text-lg">{timetable.name}</CardTitle>
                {timetable.description && <CardDescription>{timetable.description}</CardDescription>}
                <p className="text-xs text-muted-foreground">
                  Created {new Date(timetable.createdAt).toLocaleString()}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === "class" && (
                <SingleClassGrid
                  slots={singleViewSlots}
                  periodStartTimes={periodStartTimes}
                  breaks={breaks}
                  viewMode="class"
                />
              )}
              {viewMode === "teacher" && (
                <SingleClassGrid
                  slots={singleViewSlots}
                  periodStartTimes={periodStartTimes}
                  breaks={breaks}
                  viewMode="teacher"
                />
              )}
              {viewMode === "combined" && (
                <div className="space-y-6">
                  {combinedGrids.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No class data to display.
                    </div>
                  )}
                  {combinedGrids.map(g => (
                    <div key={g.classId} className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">{g.className}</h3>
                      <SingleClassGrid
                        slots={g.slots}
                        periodStartTimes={periodStartTimes}
                        breaks={breaks}
                        viewMode="class"
                      />
                    </div>
                  ))}
                </div>
              )}
              {viewMode === "master" && (
                <MasterGrid
                  slots={masterSlots}
                  periodStartTimes={periodStartTimes}
                  breaks={breaks}
                />
              )}
              {viewMode === "edit" && (
                <EditableTimetableView
                  timetable={timetable}
                  slots={editViewSlots}
                  periodStartTimes={periodStartTimes}
                  breaks={breaks}
                  subjects={subjects}
                  teachers={teachers}
                  rooms={rooms}
                  onSaved={reloadTimetable}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this timetable?</AlertDialogTitle>
            <AlertDialogDescription>
              All generated slots will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSaved={s => setSettings(s)}
      />
    </div>
  )
}

// ===== College Header =====
function CollegeHeader({ settings, onEdit }: { settings: Settings; onEdit: () => void }) {
  return (
    <div className="print-card flex items-center gap-4 border-b pb-3">
      <div className="flex-1 flex justify-start">
        {settings.logoData && (
          <img
            src={settings.logoData}
            alt="College logo"
            className="h-14 w-14 object-contain md:h-16 md:w-16"
          />
        )}
      </div>
      <div className="flex-1 text-center">
        {settings.collegeName && <h2 className="text-lg font-bold md:text-xl">{settings.collegeName}</h2>}
        {settings.department && (
          <p className="text-xs text-muted-foreground md:text-sm">{settings.department}</p>
        )}
        {settings.academicYear && (
          <p className="text-[11px] text-muted-foreground">Academic Year: {settings.academicYear}</p>
        )}
      </div>
      <div className="flex flex-1 justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="no-print h-8 w-8"
          onClick={onEdit}
          title="Edit header"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ===== Break Row =====
function BreakRow({
  colSpan,
  startTime,
  endTime,
  label,
}: {
  colSpan: number
  startTime: string
  endTime: string
  label: string | null
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border bg-amber-100 px-3 py-2 text-center dark:bg-amber-950/30"
      >
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
          <Coffee className="h-3.5 w-3.5" />
          <span>
            {startTime} – {endTime}
          </span>
          <span className="opacity-60">·</span>
          <span>{label || "Break"}</span>
        </div>
      </td>
    </tr>
  )
}

// ===== Slot Card (class / teacher view) =====
function SlotCard({ slot, viewMode }: { slot?: Slot; viewMode: "class" | "teacher" }) {
  if (!slot || slot.isBreak || (!slot.subjectId && !slot.teacherId)) {
    return (
      <div className="flex h-16 items-center justify-center rounded bg-muted/20 text-xs text-muted-foreground/60">
        —
      </div>
    )
  }
  const color = slot.subject?.color || "#6b7280"
  const isLab = slot.subject?.sessionType === "lab"
  const isElective = (slot as Slot).isElective
  return (
    <div
      className="relative flex h-20 flex-col justify-between rounded-md p-2 text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      {isLab && (
        <span className="absolute right-1 top-1 rounded bg-white/30 px-1 text-[8px] font-semibold">
          LAB
        </span>
      )}
      {isElective && (
        <span className="absolute left-1 top-1 rounded bg-white/30 px-1 text-[8px] font-semibold">
          ELECT
        </span>
      )}
      <div>
        <p className="text-xs font-bold leading-tight">{slot.subject?.code || "—"}</p>
        <p className="line-clamp-2 text-[10px] leading-tight opacity-90">
          {slot.subject?.name || ""}
        </p>
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-1 text-[9px] opacity-95">
          {viewMode === "class" ? (
            <>
              <User className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{slot.teacher?.name || "—"}</span>
            </>
          ) : (
            <>
              <Calendar className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{slot.class?.name || "—"}</span>
            </>
          )}
        </div>
        {slot.room && (
          <div className="flex items-center gap-1 text-[9px] opacity-80">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{slot.room.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Single Class / Teacher Grid =====
function SingleClassGrid({
  slots,
  periodStartTimes,
  breaks,
  viewMode,
}: {
  slots: Slot[]
  periodStartTimes: Record<number, string>
  breaks: BreakInfo[]
  viewMode: "class" | "teacher"
}) {
  const days = useMemo(
    () =>
      [...new Set(slots.map(s => s.day))].sort(
        (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)
      ),
    [slots]
  )
  const maxPeriod = useMemo(() => slots.reduce((m, s) => Math.max(m, s.period), 0), [slots])
  const cells = useMemo(() => {
    const c: Record<string, Record<number, Slot>> = {}
    for (const s of slots) {
      if (!c[s.day]) c[s.day] = {}
      c[s.day][s.period] = s
    }
    return c
  }, [slots])

  const periodNums = Array.from({ length: maxPeriod }, (_, i) => i + 1)

  if (days.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No data to display. Select a {viewMode === "class" ? "section" : "faculty"} above.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="print-table w-full min-w-[700px] border-collapse text-sm"
        style={{ tableLayout: "fixed" }}
      >
        <colgroup>
          <col style={{ width: "84px" }} />
          {days.map(d => (
            <col key={d} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="border bg-muted/50 p-2 text-left font-medium text-muted-foreground">
              <div className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" /> Time
              </div>
            </th>
            {days.map(d => (
              <th key={d} className="border bg-muted/50 p-2 text-center font-semibold">
                {DAY_LABELS[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periodNums.map(p => {
            const start =
              periodStartTimes[p] || cells[days[0]]?.[p]?.startTime || ""
            const breakBefore = breaks.find(b => b.endTime === start)
            return (
              <Fragment key={p}>
                {breakBefore && (
                  <BreakRow
                    colSpan={days.length + 1}
                    startTime={breakBefore.startTime}
                    endTime={breakBefore.endTime}
                    label={breakBefore.label}
                  />
                )}
                <tr>
                  <td className="border bg-muted/30 p-2 text-xs text-muted-foreground align-top">
                    <div className="font-medium">P{p}</div>
                    {start && <div className="text-[10px]">{start}</div>}
                  </td>
                  {days.map(d => (
                    <td key={d} className="border p-1 align-top">
                      <SlotCard slot={cells[d]?.[p]} viewMode={viewMode} />
                    </td>
                  ))}
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ===== Master Grid =====
function MasterGrid({
  slots,
  periodStartTimes,
  breaks,
}: {
  slots: Slot[]
  periodStartTimes: Record<number, string>
  breaks: BreakInfo[]
}) {
  const days = useMemo(
    () =>
      [...new Set(slots.map(s => s.day))].sort(
        (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)
      ),
    [slots]
  )
  const maxPeriod = useMemo(() => slots.reduce((m, s) => Math.max(m, s.period), 0), [slots])
  const cells = useMemo(() => {
    const c: Record<string, Record<number, Slot[]>> = {}
    for (const s of slots) {
      if (!c[s.day]) c[s.day] = {}
      if (!c[s.day][s.period]) c[s.day][s.period] = []
      c[s.day][s.period].push(s)
    }
    return c
  }, [slots])

  const periodNums = Array.from({ length: maxPeriod }, (_, i) => i + 1)

  if (days.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No slots to display.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="print-table w-full min-w-[800px] border-collapse text-sm"
        style={{ tableLayout: "fixed" }}
      >
        <colgroup>
          <col style={{ width: "84px" }} />
          {days.map(d => (
            <col key={d} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="border bg-muted/50 p-2 text-left font-medium text-muted-foreground">
              <div className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" /> Time
              </div>
            </th>
            {days.map(d => (
              <th key={d} className="border bg-muted/50 p-2 text-center font-semibold">
                {DAY_LABELS[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periodNums.map(p => {
            const start = periodStartTimes[p] || ""
            const breakBefore = breaks.find(b => b.endTime === start)
            return (
              <Fragment key={p}>
                {breakBefore && (
                  <BreakRow
                    colSpan={days.length + 1}
                    startTime={breakBefore.startTime}
                    endTime={breakBefore.endTime}
                    label={breakBefore.label}
                  />
                )}
                <tr>
                  <td className="border bg-muted/30 p-2 text-xs text-muted-foreground align-top">
                    <div className="font-medium">P{p}</div>
                    {start && <div className="text-[10px]">{start}</div>}
                  </td>
                  {days.map(d => {
                    const cellSlots = (cells[d]?.[p] || []).filter(
                      s => s.subjectId || s.teacherId
                    )
                    return (
                      <td key={d} className="border p-1 align-top">
                        <div className="min-h-[60px] space-y-1">
                          {cellSlots.length === 0 && (
                            <div className="py-2 text-center text-[10px] text-muted-foreground/50">
                              —
                            </div>
                          )}
                          {cellSlots.map(s => (
                            <MasterSlotPill key={s.id} slot={s} />
                          ))}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ===== Master Slot Pill =====
function MasterSlotPill({ slot }: { slot: Slot }) {
  const color = slot.subject?.color || "#6b7280"
  return (
    <div
      className="rounded p-1.5 text-[10px] leading-tight text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-semibold">{slot.subject?.name || "—"}</span>
        <span className="shrink-0 rounded bg-white/25 px-1 text-[9px]">
          {shortClass(slot.class)}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-1 opacity-90">
        <span className="flex items-center gap-0.5 truncate">
          <User className="h-2 w-2 shrink-0" />
          {slot.teacher?.name || "—"}
        </span>
        {slot.room && (
          <span className="flex shrink-0 items-center gap-0.5">
            <MapPin className="h-2 w-2 shrink-0" />
            {slot.room.name}
          </span>
        )}
      </div>
    </div>
  )
}

// ===== Editable Timetable View =====
function EditableTimetableView({
  timetable,
  slots,
  periodStartTimes,
  breaks,
  subjects,
  teachers,
  rooms,
  onSaved,
}: {
  timetable: Timetable
  slots: Slot[]
  periodStartTimes: Record<number, string>
  breaks: BreakInfo[]
  subjects: Subject[]
  teachers: Teacher[]
  rooms: Room[]
  onSaved: () => void
}) {
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null)

  const days = useMemo(
    () =>
      [...new Set(slots.map(s => s.day))].sort(
        (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)
      ),
    [slots]
  )
  const maxPeriod = useMemo(() => slots.reduce((m, s) => Math.max(m, s.period), 0), [slots])
  const cells = useMemo(() => {
    const c: Record<string, Record<number, Slot>> = {}
    for (const s of slots) {
      if (!c[s.day]) c[s.day] = {}
      c[s.day][s.period] = s
    }
    return c
  }, [slots])

  const periodNums = Array.from({ length: maxPeriod }, (_, i) => i + 1)

  if (days.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Select a section above to edit its timetable.
      </div>
    )
  }

  return (
    <>
      <div className="mb-3 rounded-md border border-primary/20 bg-primary/5 p-2 text-xs text-muted-foreground">
        <Pencil className="mr-1 inline h-3 w-3" />
        Click any slot to edit its subject, faculty and room. Empty slots show a{" "}
        <span className="font-medium">+ Add</span> button.
      </div>
      <div className="overflow-x-auto">
        <table
          className="print-table w-full min-w-[700px] border-collapse text-sm"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: "84px" }} />
            {days.map(d => (
              <col key={d} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="border bg-muted/50 p-2 text-left font-medium text-muted-foreground">
                <div className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" /> Time
                </div>
              </th>
              {days.map(d => (
                <th key={d} className="border bg-muted/50 p-2 text-center font-semibold">
                  {DAY_LABELS[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodNums.map(p => {
              const start = periodStartTimes[p] || ""
              const breakBefore = breaks.find(b => b.endTime === start)
              return (
                <Fragment key={p}>
                  {breakBefore && (
                    <BreakRow
                      colSpan={days.length + 1}
                      startTime={breakBefore.startTime}
                      endTime={breakBefore.endTime}
                      label={breakBefore.label}
                    />
                  )}
                  <tr>
                    <td className="border bg-muted/30 p-2 text-xs text-muted-foreground align-top">
                      <div className="font-medium">P{p}</div>
                      {start && <div className="text-[10px]">{start}</div>}
                    </td>
                    {days.map(d => {
                      const slot = cells[d]?.[p]
                      const isEmpty = !slot || (!slot.subjectId && !slot.teacherId)
                      const color = slot?.subject?.color || "#6b7280"
                      return (
                        <td key={d} className="border p-1 align-top">
                          <button
                            type="button"
                            disabled={!slot}
                            onClick={() => slot && setEditingSlot(slot)}
                            className={cn(
                              "flex h-20 w-full flex-col justify-between rounded-md p-2 text-left shadow-sm transition",
                              isEmpty
                                ? "items-center justify-center bg-muted/20 hover:bg-muted/40"
                                : "text-white hover:opacity-90",
                              !slot && "cursor-not-allowed opacity-50"
                            )}
                            style={!isEmpty ? { backgroundColor: color } : undefined}
                            title={
                              slot
                                ? `Edit ${DAY_LABELS[d]} P${p}`
                                : "No slot available"
                            }
                          >
                            {isEmpty ? (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Pencil className="h-3 w-3" /> Add
                              </span>
                            ) : (
                              <>
                                <div>
                                  <p className="text-xs font-bold leading-tight">
                                    {slot?.subject?.code || "—"}
                                  </p>
                                  <p className="line-clamp-2 text-[10px] leading-tight opacity-90">
                                    {slot?.subject?.name || ""}
                                  </p>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 text-[9px] opacity-95">
                                    <User className="h-2.5 w-2.5 shrink-0" />
                                    <span className="truncate">
                                      {slot?.teacher?.name || "—"}
                                    </span>
                                  </div>
                                  {slot?.room && (
                                    <div className="flex items-center gap-1 text-[9px] opacity-80">
                                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                                      <span className="truncate">{slot.room.name}</span>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <EditSlotDialog
        slot={editingSlot}
        subjects={subjects}
        teachers={teachers}
        rooms={rooms}
        onClose={() => setEditingSlot(null)}
        onSaved={onSaved}
      />
    </>
  )
}

// ===== Edit Slot Dialog =====
function EditSlotDialog({
  slot,
  subjects,
  teachers,
  rooms,
  onClose,
  onSaved,
}: {
  slot: Slot | null
  subjects: Subject[]
  teachers: Teacher[]
  rooms: Room[]
  onClose: () => void
  onSaved: () => void
}) {
  const [subjectId, setSubjectId] = useState("")
  const [teacherId, setTeacherId] = useState("")
  const [roomId, setRoomId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (slot) {
      setSubjectId(slot.subjectId || "")
      setTeacherId(slot.teacherId || "")
      setRoomId(slot.roomId || "")
    }
  }, [slot])

  const handleSave = async () => {
    if (!slot) return
    setSaving(true)
    try {
      const res = await fetch(`/api/timetables/${slot.timetableId}/slot/${slot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: subjectId || null,
          teacherId: teacherId || null,
          roomId: roomId || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to update slot (${res.status})`)
      }
      toast.success("Slot updated")
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!slot} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Edit Slot</DialogTitle>
          <DialogDescription>
            {slot
              ? `${DAY_LABELS[slot.day]} · Period ${slot.period} · ${slot.startTime}–${slot.endTime}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Faculty</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Select faculty" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Room</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== Settings Dialog =====
function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  settings: Settings | null
  onSaved: (s: Settings) => void
}) {
  const [collegeName, setCollegeName] = useState("")
  const [department, setDepartment] = useState("")
  const [academicYear, setAcademicYear] = useState("")
  const [logoData, setLogoData] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && settings) {
      setCollegeName(settings.collegeName || "")
      setDepartment(settings.department || "")
      setAcademicYear(settings.academicYear || "")
      setLogoData(settings.logoData || null)
    }
  }, [open, settings])

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      toast.error("Logo must be under 500KB")
      e.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = () => setLogoData(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.settings.update({
        collegeName,
        department,
        academicYear,
        logoData,
      })
      onSaved(updated as Settings)
      toast.success("Settings saved")
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>College Header Settings</DialogTitle>
          <DialogDescription>
            Customize the header shown above the printed timetable.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="college-name">College Name</Label>
            <Input
              id="college-name"
              value={collegeName}
              onChange={e => setCollegeName(e.target.value)}
              placeholder="e.g., St. Xavier's College"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="e.g., Department of Commerce"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="academic-year">Academic Year</Label>
            <Input
              id="academic-year"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="e.g., 2024-2025"
            />
          </div>
          <div className="space-y-2">
            <Label>College Logo</Label>
            <div className="flex items-center gap-3">
              {logoData ? (
                <img
                  src={logoData}
                  alt="Logo preview"
                  className="h-12 w-12 rounded border object-contain"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded border text-muted-foreground">
                  <Upload className="h-4 w-4" />
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogo}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">Max 500KB. PNG, JPG or SVG.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
