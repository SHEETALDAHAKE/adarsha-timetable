import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const csvText: string = body.csv || ""
    if (!csvText.trim()) return NextResponse.json({ error: "CSV data is required" }, { status: 400 })
    const rows = parseCSV(csvText)
    if (rows.length < 2) return NextResponse.json({ error: "Need header + 1 data row" }, { status: 400 })
    const headers = rows[0].map(h => h.trim().toLowerCase())
    const idx = (k: string) => headers.indexOf(k)
    if (idx("name") < 0) return NextResponse.json({ error: `Missing: name. Found: ${headers.join(", ")}` }, { status: 400 })
    let imported = 0, skipped = 0
    const errors: { row: number; error: string }[] = []
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i]
      if (cells.length === 1 && !cells[0].trim()) continue
      const name = (cells[idx("name")] || "").replace(/[\r\n]+/g, " ").trim()
      if (!name) { skipped++; errors.push({ row: i + 1, error: "Missing name" }); continue }
      try {
        await db.teacher.create({ data: { name, email: idx("email") >= 0 ? (cells[idx("email")] || "").trim() || null : null, department: idx("department") >= 0 ? (cells[idx("department")] || "").trim() || null : null, employeeId: idx("employeeid") >= 0 ? (cells[idx("employeeid")] || "").trim() || null : null, designation: idx("designation") >= 0 ? (cells[idx("designation")] || "").trim() || null : null, maxHoursPerWeek: idx("maxhoursperweek") >= 0 ? parseIntSafe(cells[idx("maxhoursperweek")], 16) : 16, minHoursPerWeek: idx("minhoursperweek") >= 0 ? parseIntSafe(cells[idx("minhoursperweek")], 8) : 8 } })
        imported++
      } catch (e: any) { skipped++; errors.push({ row: i + 1, error: e.message?.includes("Unique") ? `Duplicate: ${name}` : e.message }) }
    }
    return NextResponse.json({ imported, skipped, errors: errors.slice(0, 20), total: rows.length - 1 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let cr: string[] = []; let cf = ""; let iq = false
  for (let i = 0; i < text.length; i++) { const ch = text[i]
    if (iq) { if (ch === '"') { if (text[i + 1] === '"') { cf += '"'; i++ } else { iq = false } } else { cf += ch } }
    else { if (ch === '"') { iq = true } else if (ch === ",") { cr.push(cf); cf = "" } else if (ch === "\n") { cr.push(cf); cf = ""; if (cr.some(c => c.trim())) rows.push(cr); cr = [] } else if (ch === "\r") {} else { cf += ch } } }
  if (cf || cr.length > 0) { cr.push(cf); if (cr.some(c => c.trim())) rows.push(cr) }
  return rows
}
function parseIntSafe(val: any, d: number): number { if (val == null || val === "") return d; const n = parseInt(String(val).replace(/\.0$/, ""), 10); return isNaN(n) ? d : n }
