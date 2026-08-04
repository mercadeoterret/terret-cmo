import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const sb = createServiceClient()
  const { data, error } = await sb.from('campanas').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
export async function POST(req: NextRequest) {
  const sb = createServiceClient()
  const body = await req.json()
  const { data, error } = await sb.from('campanas').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
export async function PATCH(req: NextRequest) {
  const sb = createServiceClient()
  const { id, ...updates } = await req.json()
  const { data, error } = await sb.from('campanas').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
export async function DELETE(req: NextRequest) {
  const sb = createServiceClient()
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  const { error } = await sb.from('campanas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
