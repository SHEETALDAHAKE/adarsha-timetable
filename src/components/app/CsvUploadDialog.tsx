"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Download, FileText, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from "@/lib/types"
import * as XLSX from "xlsx"

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  type: "teachers" | "subjects"
  onUploaded: () => void
}

type Result = { imported: number; skipped: number; errors: { row: number; error: string }[]; total: number }

export function CsvUploadDialog({ open, onOpenChange, type, onUploaded }: Props) {
  const [csvText, setCsvText] = useState("")
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [fileName, setFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const label = type === "teachers" ? "Faculty" : "Courses"
  const templateColumns = type === "teachers"
    ? "name, email, department, employeeId, designation, maxHoursPerWeek, minHoursPerWeek"
    : "name, code, department, credits, weeklyHours, durationMinutes, difficulty, sessionType, requiresRoomType, batchSize"

  // Convert Excel file to CSV text using SheetJS
  const excelToCsv = (data: ArrayBuffer): string => {
    const workbook = XLSX.read(data, { type: "array" })
    const firstSheet = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheet]
    return XLSX.utils.sheet_to_csv(worksheet)
  }

  // Generate and download an Excel template
  const downloadExcelTemplate = () => {
    const headers = type === "teachers"
      ? ["name", "email", "department", "employeeId", "designation", "maxHoursPerWeek", "minHoursPerWeek"]
      : ["name", "code", "department", "credits", "weeklyHours", "durationMinutes", "difficulty", "sessionType", "requiresRoomType", "batchSize"]

    const sampleRows = type === "teachers"
      ? [
          ["Dr. Anjali Verma", "anjali@college.edu", "Computer Science & Engineering", "PROF-001", "Professor", 14, 8],
          ["Prof. Rajesh Kumar", "rajesh@college.edu", "Electronics & Communication", "PROF-002", "Assistant Professor", 18, 12],
        ]
      : [
          ["Data Structures & Algorithms", "CS201", "CSE", 4, 4, 50, "hard", "theory", "lecture", 0],
          ["DBMS Lab", "CS203L", "CSE", 2, 4, 100, "medium", "lab", "computer", 30],
        ]

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows])
    ws["!cols"] = headers.map((h: string) => ({ wch: Math.max(h.length + 4, 15) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, type === "teachers" ? "Faculty" : "Courses")
    XLSX.writeFile(wb, type === "teachers" ? "faculty_template.xlsx" : "courses_template.xlsx")
    toast.success("Excel template downloaded")
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const lowerName = file.name.toLowerCase()
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")
    const isCsv = lowerName.endsWith(".csv") || lowerName.endsWith(".txt")

    if (!isExcel && !isCsv) {
      toast.error("Please select a .xlsx, .xls, or .csv file")
      return
    }

    setFileName(file.name)

    if (isCsv) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        setCsvText(text)
        setResult(null)
        toast.success(`Loaded ${file.name} (${text.split("\n").length} lines)`)
      }
      reader.readAsText(file)
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = ev.target?.result as ArrayBuffer
          const csv = excelToCsv(data)
          setCsvText(csv)
          setResult(null)
          toast.success(`Loaded Excel file ${file.name} → ${csv.split("\n").length - 1} data row(s)`)
        } catch (err: any) {
          toast.error(`Failed to parse Excel file: ${err.message}`)
        }
      }
      reader.readAsArrayBuffer(file)
    }

    e.target.value = ""
  }

  const handleUpload = async () => {
    if (!csvText.trim()) {
      toast.error("Please select a file or paste data")
      return
    }
    setUploading(true)
    setResult(null)
    try {
      const res = type === "teachers" ? await api.upload.teachers(csvText) : await api.upload.subjects(csvText)
      setResult(res)
      if (res.imported > 0) {
        toast.success(`Imported ${res.imported} ${type === "teachers" ? "faculty" : "course"}(s)`)
        onUploaded()
      } else {
        toast.error("No records imported — check errors below")
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUploading(false)
    }
  }

  const downloadCsvTemplate = () => {
    const url = api.upload.templateUrl(type)
    const a = document.createElement("a")
    a.href = url
    a.download = type === "teachers" ? "faculty_template.csv" : "courses_template.csv"
    a.click()
  }

  const handleClose = () => {
    setCsvText("")
    setResult(null)
    setFileName("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Bulk Import {label}
          </DialogTitle>
          <DialogDescription>
            Upload an <b>Excel (.xlsx, .xls)</b> or <b>CSV (.csv)</b> file to import multiple{" "}
            {type === "teachers" ? "faculty members" : "courses"} at once.
            Download a template, fill it in, then upload.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Step 1: Download template */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> Step 1: Download Template
            </p>
            <p className="text-xs text-muted-foreground">
              Columns: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{templateColumns}</code>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadExcelTemplate} className="gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel Template
              </Button>
              <Button variant="outline" size="sm" onClick={downloadCsvTemplate} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> CSV Template
              </Button>
            </div>
          </div>

          {/* Step 2: Select file */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Step 2: Select Excel or CSV File</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" /> Choose File
              </Button>
              {fileName && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <FileSpreadsheet className="h-3 w-3" /> {fileName}
                </span>
              )}
              {!fileName && (
                <span className="text-xs text-muted-foreground">Or paste data below</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Supported formats: <b>.xlsx</b>, <b>.xls</b> (Excel), <b>.csv</b>
            </p>
          </div>

          {/* Step 3: Review data */}
          <div className="grid gap-2">
            <Label>Step 3: Review Data (auto-converted from Excel if needed)</Label>
            <Textarea
              value={csvText}
              onChange={e => { setCsvText(e.target.value); setResult(null) }}
              placeholder={`Paste CSV here, or select an Excel file above...\n${type === "teachers" ? "name,email,department,employeeId,designation,maxHoursPerWeek,minHoursPerWeek\nDr. John Doe,john@college.edu,CSE,PROF-001,Professor,14,8" : "name,code,department,credits,weeklyHours,durationMinutes,difficulty,sessionType,requiresRoomType,batchSize\nData Structures,CS201,CSE,4,4,50,hard,theory,lecture,0"}`}
              className="font-mono text-xs min-h-[200px] max-h-[300px]"
            />
            <p className="text-xs text-muted-foreground">
              {csvText ? `${csvText.split("\n").filter(l => l.trim()).length - 1} data row(s) detected` : "No data yet"}
            </p>
          </div>

          {/* Result */}
          {result && (
            <Alert variant={result.imported > 0 ? "default" : "destructive"}>
              {result.imported > 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle className="text-sm">Import Complete: {result.imported} imported, {result.skipped} skipped</AlertTitle>
              <AlertDescription className="text-xs">
                {result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Errors (first {Math.min(result.errors.length, 20)}):</p>
                    <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                      {result.errors.map((e, i) => (
                        <li key={i} className="text-red-600 dark:text-red-400">Row {e.row}: {e.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
          <Button onClick={handleUpload} disabled={uploading || !csvText.trim()} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading..." : `Import ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
