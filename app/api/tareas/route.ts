import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const sb = createServiceClient()
  const { searchParams } = new URL(req.url)
  const fecha = searchParams.get('fecha')
  const campana_id = searchParams.get('campana_id')
  const responsable = searchParams.get('responsable')
  const estado = searchParams.get('estado')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let q = sb.from('calendario_eventos').select('*, campanas(nombre)').order('fecha').order('created_at')
  if (fecha) q = q.eq('fecha', fecha)
  if (campana_id) q = q.eq('campana_id', campana_id)
  if (responsable) q = q.eq('responsable', responsable)
  if (estado) q = q.eq('estado', estado)
  if (from) q = q.gte('fecha', from)
  if (to) q = q.lte('fecha', to)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sb = createServiceClient()
  const body = await req.json()
  if (Array.isArray(body)) {
    const { data, error } = await sb.from('calendario_eventos').insert(body).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }
  const { data, error } = await sb.from('calendario_eventos').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const sb = createServiceClient()
  const body = await req.json()
  const { id, ...updates } = body
  const { data, error } = await sb.from('calendario_eventos').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const sb = createServiceClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const campana_id = searchParams.get('campana_id')
  if (campana_id) {
    const { error } = await sb.from('calendario_eventos').delete().eq('campana_id', campana_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  const { error } = await sb.from('calendario_eventos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
