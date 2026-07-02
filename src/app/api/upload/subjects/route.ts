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
    if (idx("name") < 0) return NextResponse.json({ error: `Missing: name` }, { status: 400 })
    const codeIdx = idx("code") >= 0 ? idx("code") : idx("coursecode")
    if (codeIdx < 0) return NextResponse.json({ error: `Missing: code` }, { status: 400 })
    const creditIdx = idx("credits") >= 0 ? idx("credits") : idx("credit")
    const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#14b8a6", "#06b6d4", "#8b5cf6", "#ec4899", "#f43f5e"]
    let imported = 0, skipped = 0
    const errors: { row: number; error: string }[] = []
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i]
      if (cells.length === 1 && !cells[0].trim()) continue
      const name = (cells[idx("name")] || "").replace(/[\r\n]+/g, " ").trim()
      let code = cells[codeIdx]; if (code != null) { code = String(code).trim(); if (code.endsWith(".0")) code = code.slice(0, -2) }
      if (!name || !code) { skipped++; errors.push({ row: i + 1, error: `Missing name or code` }); continue }
      const rd = idx("difficulty") >= 0 ? (cells[idx("difficulty")] || "").trim().toLowerCase() : "medium"
      const difficulty = rd.startsWith("hard") ? "hard" : rd.startsWith("easy") ? "easy" : "medium"
      const rs = idx("sessiontype") >= 0 ? (cells[idx("sessiontype")] || "").trim().toLowerCase() : "theory"
      const sessionType = rs.startsWith("theory") || rs.includes("lecture") ? "theory" : rs.startsWith("lab") || rs.includes("practical") ? "lab" : rs.startsWith("tutorial") ? "tutorial" : "theory"
      const rr = idx("requiresroomtype") >= 0 ? (cells[idx("requiresroomtype")] || "").trim().toLowerCase() : null
      const requiresRoomType = rr ? (rr.includes("computer") ? "computer" : rr.includes("lab") && !rr.includes("lecture") ? "lab" : rr.includes("seminar") ? "seminar" : rr.includes("lecture") || rr.includes("hall") ? "lecture" : rr) : null
      let batchSize = idx("batchsize") >= 0 ? parseIntSafe(cells[idx("batchsize")], 0) : 0; if (batchSize >= 50) batchSize = 0
      try { await db.subject.create({ data: { name, code: String(code), department: idx("department") >= 0 ? (cells[idx("department")] || "").trim() || null : null, credits: creditIdx >= 0 ? parseIntSafe(cells[creditIdx], 4) : 4, weeklyHours: idx("weeklyhours") >= 0 ? parseIntSafe(cells[idx("weeklyhours")], 3) : 3, durationMinutes: idx("durationminutes") >= 0 ? parseIntSafe(cells[idx("durationminutes")], 50) : 50, difficulty, sessionType, requiresRoomType, batchSize, color: COLORS[i % COLORS.length] } }); imported++ }
      catch (e: any) { skipped++; errors.push({ row: i + 1, error: e.message?.includes("Unique") ? `Duplicate: ${code}` : e.message }) }
    }
    return NextResponse.json({ imported, skipped, errors: errors.slice(0, 20), total: rows.length - 1 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
function parseCSV(text: string): string[][] { const rows: string[][] = []; let cr: string[] = []; let cf = ""; let iq = false; for (let i = 0; i < text.length; i++) { const ch = text[i]; if (iq) { if (ch === '"') { if (text[i + 1] === '"') { cf += '"'; i++ } else { iq = false } } else { cf += ch } } else { if (ch === '"') { iq = true } else if (ch === ",") { cr.push(cf); cf = "" } else if (ch === "\n") { cr.push(cf); cf = ""; if (cr.some(c => c.trim())) rows.push(cr); cr = [] } else if (ch === "\r") {} else { cf += ch } } } if (cf || cr.length > 0) { cr.push(cf); if (cr.some(c => c.trim())) rows.push(cr) } return rows }
function parseIntSafe(val: any, d: number): number { if (val == null || val === "") return d; const n = parseInt(String(val).replace(/\.0$/, ""), 10); return isNaN(n) ? d : n }
