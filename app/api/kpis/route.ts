import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const sb = createServiceClient()
  const { data, error } = await sb.from('kpis').select('*').order('semana', { ascending: false }).limit(12)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
export async function POST(req: NextRequest) {
  const sb = createServiceClient()
  const body = await req.json()
  if (!body.semana) {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    body.semana = new Date(today.setDate(diff)).toISOString().split('T')[0]
  }
  const { data, error } = await sb.from('kpis').upsert(body, { onConflict: 'semana' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
