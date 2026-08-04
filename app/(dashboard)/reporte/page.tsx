'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, RefreshCw, CheckCircle } from 'lucide-react'
interface Accion{titulo:string;que_hacer:string;responsable:string;prioridad:string;metrica:string}
interface Reporte{id:string;fecha:string;tipo:string;reporte_markdown:string;acciones:Accion[];kpi_snapshot:Record<string,number>;created_at:string}
export default function ReportePage(){
  const [reportes,setReportes]=useState<Reporte[]>([])
  const [loading,setLoading]=useState(true)
  const [generating,setGenerating]=useState(false)
  const [sel,setSel]=useState<Reporte|null>(null)
  useEffect(()=>{load()},[])
  async function load(){setLoading(true);const r=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reportes_lunes?select=*&order=fecha.desc&limit=8`,{headers:{'apikey':process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,'Authorization':`Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`}});const d=await r.json();setReportes(Array.isArray(d)?d:[]);setLoading(false)}
  async function generar(){const secret=prompt('Ingresa el CRON_SECRET:');if(!secret)return;setGenerating(true);await fetch('/api/cron',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret})});setGenerating(false);setTimeout(load,2000)}
  const reporte=sel||reportes[0]
  const PC:Record<string,{bg:string;color:string}>={'Alta':{bg:'#fee2e2',color:'#b91c1c'},'Media':{bg:'#fef3c7',color:'#92400e'},'Baja':{bg:'#dcfce7',color:'#15803d'}}
  return(
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div><h1 style={{fontSize:22,fontWeight:800,color:'#1a1a18',margin:0}}>Reporte semanal</h1><p style={{fontSize:13,color:'#6b6a63',margin:'4px 0 0'}}>Auto-generado cada lunes 7AM. Diagnóstico + 5 acciones concretas.</p></div>
        <button onClick={generar} disabled={generating} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 18px',background:'#1a1a18',color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{generating?<Loader2 size={13} className="animate-spin"/>:<RefreshCw size={13}/>}Generar ahora</button>
      </div>
      {loading?<div style={{fontSize:13,color:'#9c9a92',padding:40,textAlign:'center'}}>Cargando...</div>:
      reportes.length===0?<div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:60,textAlign:'center'}}><div style={{fontSize:32,marginBottom:12}}>📄</div><div style={{fontSize:15,fontWeight:700,color:'#1a1a18',marginBottom:6}}>Sin reportes aún</div><div style={{fontSize:13,color:'#9c9a92',marginBottom:16}}>El primer reporte se genera automáticamente el próximo lunes a las 7AM.</div><button onClick={generar} disabled={generating} style={{padding:'9px 20px',background:'#1a1a18',color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Generar ahora</button></div>:(
        <div style={{display:'grid',gridTemplateColumns:'180px 1fr',gap:16}}>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {reportes.map(r=><button key={r.id} onClick={()=>setSel(r)} style={{padding:12,borderRadius:10,cursor:'pointer',textAlign:'left',fontFamily:'inherit',background:r.id===reporte?.id?'#1a1a18':'#fff',color:r.id===reporte?.id?'#fff':'#1a1a18',border:r.id===reporte?.id?'none':'1px solid #e0dfd5'}}>
              <div style={{fontSize:11,fontWeight:700}}>{format(new Date(r.fecha+'T12:00:00'),"d 'de' MMM",{locale:es})}</div>
              <div style={{fontSize:10,marginTop:2,opacity:.7}}>{r.tipo==='automatico'?'🤖 Auto':'✋ Manual'}</div>
              {r.kpi_snapshot?.roas_meta&&<div style={{fontSize:10,marginTop:4,opacity:.7}}>ROAS: {r.kpi_snapshot.roas_meta}x</div>}
            </button>)}
          </div>
          {reporte&&<div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div><div style={{fontSize:15,fontWeight:800,color:'#1a1a18'}}>Semana del {format(new Date(reporte.fecha+'T12:00:00'),"d 'de' MMMM yyyy",{locale:es})}</div><div style={{fontSize:11,color:'#9c9a92',marginTop:2}}>{reporte.tipo==='automatico'?'🤖 Automático':'✋ Manual'}</div></div>
                {reporte.kpi_snapshot&&<div style={{display:'flex',gap:16}}>{[{l:'Meta',v:reporte.kpi_snapshot.roas_meta},{l:'Google',v:reporte.kpi_snapshot.roas_google},{l:'TikTok',v:reporte.kpi_snapshot.roas_tiktok}].map(k=><div key={k.l} style={{textAlign:'center'}}><div style={{fontSize:9,color:'#9c9a92'}}>{k.l}</div><div style={{fontSize:14,fontWeight:800,color:k.v>=7?'#15803d':k.v>=5?'#b45309':'#dc2626'}}>{k.v?`${k.v}x`:'—'}</div></div>)}</div>}
              </div>
              {reporte.acciones?.length>0&&<div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Top {reporte.acciones.length} acciones</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {reporte.acciones.map((a,i)=>{const c=PC[a.prioridad]||{bg:'#f0efe8',color:'#6b6a63'};return(<div key={i} style={{display:'flex',gap:12,padding:12,borderRadius:10,border:'1px solid #f0efe8',background:'#fafaf8'}}>
                    <div style={{width:24,height:24,borderRadius:'50%',background:'#1a1a18',color:'#fff',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><div style={{fontSize:12,fontWeight:700,color:'#1a1a18'}}>{a.titulo}</div><span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:20,background:c.bg,color:c.color}}>{a.prioridad}</span><span style={{fontSize:9,color:'#9c9a92'}}>{a.responsable}</span></div>
                    <div style={{fontSize:11,color:'#6b6a63'}}>{a.que_hacer}</div>
                    {a.metrica&&<div style={{fontSize:10,color:'#9c9a92',marginTop:4,display:'flex',alignItems:'center',gap:4}}><CheckCircle size={10}/>{a.metrica}</div>}</div>
                  </div>)})}
                </div>
              </div>}
              <div style={{fontSize:11,fontWeight:700,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>Reporte completo</div>
              <div style={{fontSize:12,color:'#6b6a63',lineHeight:1.7,whiteSpace:'pre-wrap',background:'#f8f8f5',borderRadius:10,padding:16,maxHeight:400,overflowY:'auto'}}>{reporte.reporte_markdown}</div>
            </div>
          </div>}
        </div>
      )}
    </div>
  )
}
