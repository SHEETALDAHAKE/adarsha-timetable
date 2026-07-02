"use client"

import { useState, useEffect } from "react"
import { Dashboard } from "@/components/app/Dashboard"
import { Teachers } from "@/components/app/Teachers"
import { Subjects } from "@/components/app/Subjects"
import { Classes } from "@/components/app/Classes"
import { Rooms } from "@/components/app/Rooms"
import { Assignments } from "@/components/app/Assignments"
import { Generate } from "@/components/app/Generate"
import { TimetableView } from "@/components/app/TimetableView"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, BookOpen, GraduationCap, DoorOpen, Link2, Sparkles, Calendar, Database, Menu, X } from "lucide-react"
import { api } from "@/lib/types"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "College-wide analytics" },
  { id: "teachers", label: "Faculty", icon: Users, description: "Professors, load & availability" },
  { id: "subjects", label: "Courses", icon: BookOpen, description: "Subjects with credits & labs" },
  { id: "classes", label: "Sections", icon: GraduationCap, description: "Programs, years, semesters" },
  { id: "rooms", label: "Rooms", icon: DoorOpen, description: "Lecture halls & labs" },
  { id: "assignments", label: "Assignments", icon: Link2, description: "Link faculty ↔ course ↔ section" },
  { id: "generate", label: "Generate", icon: Sparkles, description: "Run the smart scheduler" },
  { id: "timetable", label: "Timetables", icon: Calendar, description: "View generated timetables" },
]

export default function Home() {
  const [active, setActive] = useState("dashboard")
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedTimetableId, setSelectedTimetableId] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [seedOpen, setSeedOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)

  // Trigger dashboard refresh when returning to dashboard tab
  useEffect(() => {
    if (active === "dashboard") setRefreshKey(k => k + 1)
  }, [active])

  const navigate = (tab: string) => {
    setActive(tab)
    setMobileNavOpen(false)
    if (tab === "dashboard") setRefreshKey(k => k + 1)
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await api.seed()
      toast.success("Demo data loaded successfully!")
      setSeedOpen(false)
      setRefreshKey(k => k + 1)
      navigate("dashboard")
    } catch (e: any) {
      toast.error(e.message)
    } finally { setSeeding(false) }
  }

  const handleGenerated = (timetableId: string) => {
    setSelectedTimetableId(timetableId)
    navigate("timetable")
  }

  const currentNav = NAV_ITEMS.find(n => n.id === active)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center gap-3 px-4 md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(o => !o)}>
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Adarsha Timetable</h1>
              <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">Smart Timetable Manager</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 hidden sm:flex" onClick={() => setSeedOpen(true)}>
              <Database className="h-3.5 w-3.5" /> Load Demo
            </Button>
            <Button size="sm" className="gap-2" onClick={() => navigate("generate")}>
              <Sparkles className="h-3.5 w-3.5" /> Generate
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-card/50">
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    isActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent"
                  }`}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${isActive ? "text-primary-foreground" : ""}`}>{item.label}</p>
                    <p className={`text-[10px] truncate ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{item.description}</p>
                  </div>
                </button>
              )
            })}
          </nav>
          <div className="p-3 border-t">
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setSeedOpen(true)}>
              <Database className="h-3.5 w-3.5" /> Load Demo Data
            </Button>
          </div>
        </aside>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur" onClick={() => setMobileNavOpen(false)}>
            <div className="absolute left-0 top-14 bottom-0 w-72 bg-card border-r shadow-lg p-3 space-y-1 overflow-y-auto" onClick={e => e.stopPropagation()}>
              {NAV_ITEMS.map(item => {
                const Icon = item.icon
                const isActive = active === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    }`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    <div>
                      <p className={`text-sm font-medium ${isActive ? "text-primary-foreground" : ""}`}>{item.label}</p>
                      <p className={`text-[10px] ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{item.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden">
          <div className="container mx-auto px-4 md:px-6 py-6 max-w-7xl">
            {active === "dashboard" && <Dashboard onNavigate={navigate} refreshKey={refreshKey} />}
            {active === "teachers" && <Teachers />}
            {active === "subjects" && <Subjects />}
            {active === "classes" && <Classes />}
            {active === "rooms" && <Rooms />}
            {active === "assignments" && <Assignments />}
            {active === "generate" && <Generate onGenerated={handleGenerated} />}
            {active === "timetable" && <TimetableView selectedId={selectedTimetableId} onSelect={setSelectedTimetableId} />}
          </div>
          <footer className="mt-auto border-t bg-card/30 py-4 px-6 text-center text-xs text-muted-foreground">
            <p>EduSched — Scientific Timetable & Teacher Workload Manager · Built with Next.js, Prisma & smart constraint-based scheduling</p>
          </footer>
        </main>
      </div>

      <Dialog open={seedOpen} onOpenChange={setSeedOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Load Demo Data?</DialogTitle>
            <DialogDescription>
              This will <b>replace all existing data</b> with a sample dataset: 8 teachers, 9 subjects, 4 classes, and 36 teaching assignments. You can then generate a complete timetable in one click.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeedOpen(false)}>Cancel</Button>
            <Button onClick={handleSeed} disabled={seeding} className="gap-2">
              <Database className="h-4 w-4" />
              {seeding ? "Loading…" : "Load Demo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
