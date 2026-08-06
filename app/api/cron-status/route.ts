import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const { data } = await getClient().from('cron_status').select('*').eq('id', 'singleton').single()
  return NextResponse.json(data || { estado: 'idle' })
}
