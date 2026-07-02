"use client"

import { useState, useEffect } from "react"
import { api, type ClassInfo } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Clock, Calendar, Coffee, AlertCircle, CheckCircle2, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const ALL_DAYS = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
]

type GenResult = {
  timetableId: string
  totalSlots: number
  scheduledSlots: number
  unscheduled: { classId: string; className: string; subjectCode: string; remaining: number }[]
  conflicts: string[]
}

export function Generate({ onGenerated }: { onGenerated: (timetableId: string) => void }) {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [form, setForm] = useState({
    timetableName: `College Timetable ${new Date().toLocaleDateString()}`,
    description: "",
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"] as string[],
    periodsPerDay: 6,
    startTime: "09:00",
    periodMinutes: 50,
    breakAfterPeriod: 3,
    breakLabel: "Lunch Break",
    breakMinutes: 40,
  })
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GenResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.classes.list().then(setClasses).catch(e => toast.error(e.message))
  }, [])

  const toggleClass = (id: string) => {
    setSelectedClassIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleAllClasses = () => {
    setSelectedClassIds(prev => prev.length === classes.length ? [] : classes.map(c => c.id))
  }
  const toggleDay = (id: string) => {
    setForm(f => ({ ...f, days: f.days.includes(id) ? f.days.filter(x => x !== id) : [...f.days, id] }))
  }

  const submit = async () => {
    if (form.days.length === 0) { toast.error("Select at least one day"); return }
    if (form.periodsPerDay < 1 || form.periodsPerDay > 12) { toast.error("Periods per day must be 1–12"); return }
    setError(null); setResult(null); setGenerating(true)
    try {
      const config = {
        ...form,
        classIds: selectedClassIds,
      }
      const r = await api.timetables.generate(config)
      setResult(r)
      toast.success(`Timetable generated — ${r.scheduledSlots}/${r.totalSlots} slots scheduled`)
    } catch (e: any) {
      setError(e.message)
      toast.error(e.message)
    } finally { setGenerating(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Generate Timetable</h2>
        <p className="text-sm text-muted-foreground">Configure parameters and let the smart scheduler build a conflict-free weekly timetable</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4" /> Basic Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Timetable Name</Label>
                <Input value={form.timetableName} onChange={e => setForm({ ...form, timetableName: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Description (optional)</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g., Fall 2026 Semester" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Periods/day</Label>
                  <Input type="number" min={1} max={12} value={form.periodsPerDay} onChange={e => setForm({ ...form, periodsPerDay: Number(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Start time</Label>
                  <Input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Period (min)</Label>
                  <Input type="number" min={30} max={90} step={5} value={form.periodMinutes} onChange={e => setForm({ ...form, periodMinutes: Number(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1.5"><Coffee className="h-3 w-3" /> Break after P</Label>
                  <Input type="number" min={0} max={12} value={form.breakAfterPeriod} onChange={e => setForm({ ...form, breakAfterPeriod: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Break label</Label>
                  <Input value={form.breakLabel} onChange={e => setForm({ ...form, breakLabel: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Break (min)</Label>
                  <Input type="number" min={5} max={60} value={form.breakMinutes} onChange={e => setForm({ ...form, breakMinutes: Number(e.target.value) })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4" /> Working Days</CardTitle>
              <CardDescription>Choose which days of the week to schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {ALL_DAYS.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${
                      form.days.includes(d.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Classes to Schedule</CardTitle>
                  <CardDescription>Select which classes get a timetable</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedClassIds(prev => prev.length === classes.length ? [] : classes.map(c => c.id))}>
                  {selectedClassIds.length === classes.length ? "Deselect all" : "Select all"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No classes yet. Add classes first.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {classes.map(c => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition ${
                        selectedClassIds.includes(c.id) ? "border-primary bg-primary/5" : "hover:border-primary/50"
                      }`}
                    >
                      <Checkbox checked={selectedClassIds.includes(c.id)} onCheckedChange={() => toggleClass(c.id)} />
                      <span className="text-sm font-medium">{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedClassIds.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">{selectedClassIds.length} class(es) selected</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — scheduling rules + generate button */}
        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Scheduling Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <RuleItem label="No faculty double-booking" />
              <RuleItem label="No section double-booking" />
              <RuleItem label="No room double-booking (incl. labs)" />
              <RuleItem label="Faculty availability (blocked slots) respected" />
              <RuleItem label="Hard courses prefer morning periods" />
              <RuleItem label="Labs use two consecutive periods" />
              <RuleItem label="Lab/computer courses match room type" />
              <RuleItem label="Room capacity fits section size" />
              <RuleItem label="Max 2 same course per day per section" />
              <RuleItem label="Spread courses across the week" />
              <RuleItem label="Balance faculty daily load" />
              <RuleItem label="Respect faculty weekly hour limits" />
            </CardContent>
          </Card>

          <Button onClick={submit} disabled={generating} className="w-full gap-2 h-12 text-base">
            <Sparkles className="h-5 w-5" />
            {generating ? "Scheduling…" : "Generate Timetable"}
          </Button>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xl font-bold">{result.scheduledSlots}</p>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xl font-bold">{result.totalSlots}</p>
                    <p className="text-xs text-muted-foreground">Total Slots</p>
                  </div>
                </div>
                {result.unscheduled.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-sm">{result.unscheduled.length} unscheduled item(s)</AlertTitle>
                    <AlertDescription className="text-xs">
                      <ul className="mt-1 space-y-0.5">
                        {result.unscheduled.slice(0, 5).map((u, i) => (
                          <li key={i}>{u.className} · {u.subjectCode} — {u.remaining} lesson(s)</li>
                        ))}
                        {result.unscheduled.length > 5 && <li>… and {result.unscheduled.length - 5} more</li>}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <Button onClick={() => onGenerated(result.timetableId)} className="w-full">View Generated Timetable</Button>
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Scheduling failed</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}

function RuleItem({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}
