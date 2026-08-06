import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const { data, error } = await getClient()
    .from('fechas_calendario')
    .select('*')
    .order('fecha')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await getClient()
    .from('fechas_calendario')
    .insert({
      fecha: body.fecha,
      nombre: body.nombre,
      tipo: body.tipo,
      ciudad: body.ciudad || null,
      distancia: body.distancia || null,
      fuente: 'cmo',
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
