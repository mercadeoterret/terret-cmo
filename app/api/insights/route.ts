import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const sb = createServiceClient()
  const { data, error } = await sb.from('insights').select('*').order('created_at', { ascending: false }).limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sb = createServiceClient()
  const { contenido, tipo } = await req.json()
  const { data, error } = await sb.from('insights').insert({ contenido, tipo: tipo || 'manual' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
