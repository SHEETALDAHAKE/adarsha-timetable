import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  let s = await db.setting.findUnique({ where: { id: "singleton" } })
  if (!s) s = await db.setting.create({ data: { id: "singleton" } })
  return NextResponse.json(s)
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const s = await db.setting.upsert({
    where: { id: "singleton" },
    update: { collegeName: body.collegeName ?? null, department: body.department ?? null, academicYear: body.academicYear ?? null, logoData: body.logoData ?? null },
    create: { id: "singleton", collegeName: body.collegeName ?? null, department: body.department ?? null, academicYear: body.academicYear ?? null, logoData: body.logoData ?? null },
  })
  return NextResponse.json(s)
}
