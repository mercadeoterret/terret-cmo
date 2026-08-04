'use client'
import { useState, useEffect } from 'react'
import { Loader2, Save, Copy, Trash2, ChevronDown, ChevronRight, Calendar, CheckCircle } from 'lucide-react'

const STEPS = ['Contexto', 'Objetivos', 'Canales', 'Audiencia', 'Estrategia']
const EVENTOS_CLAVE = [
  { value: '', label: '— Sin relación específica —' },
  { value: 'medellin', label: 'Maratón de Medellín — 5-6 sep 2026 ⭐' },
  { value: 'mmb', label: 'Media Maratón de Bogotá — 26 jul 2026 ⭐' },
  { value: 'cali', label: 'Maratón de Cali — 2-3 may 2026' },
  { value: 'cartagena', label: 'Media Maratón del Mar — 22 feb 2026' },
  { value: 'amor', label: 'Amor y Amistad — 20 sep 2026 🧡' },
  { value: 'madre', label: 'Día de la Madre — 10 may 2026' },
  { value: 'padre', label: 'Día del Padre — 21 jun 2026' },
  { value: 'bfco', label: 'Black Friday Colombia — 5-7 jun 2026' },
  { value: 'hotsale1', label: 'Hot Sale Colombia 1ª ed. — 17-21 mar 2026' },
  { value: 'hotsale2', label: 'Hot Sale Colombia 2ª ed. — 20-24 oct 2026' },
  { value: 'navidad', label: 'Temporada navideña — dic 2026' },
]
const CANAL_COLORS: Record<string, string> = {
  Instagram:'#e040fb',TikTok:'#00bcd4','Meta Ads':'#1877f2','Google Ads':'#4285f4',
  Email:'#15803d',WhatsApp:'#25d366',Offline:'#b45309',Creadora:'#7c3aed',
}
interface Campana { id:string;nombre:string;estado:string;fecha_inicio:string;fecha_fin:string;objetivo:string;output_claude:string;created_at:string;descripcion:string;presupuesto:number }

function parsearCronograma(texto: string, campanaId: string) {
  const tareas: Record<string,unknown>[] = []
  for (const line of texto.split('\n')) {
    const m = line.match(/DIA:\s*(\d{4}-\d{2}-\d{2})\s*\|\s*CANAL:\s*([^|]+)\s*\|\s*TIPO:\s*([^|]+)\s*\|\s*TAREA:\s*([^|]+)(?:\s*\|\s*RESPONSABLE:\s*(.+))?/)
    if (m) {
      const [,fecha,canal,tipo,tarea,responsable] = m
      const c = canal.trim()
      tareas.push({
        fecha:fecha.trim(), titulo:tarea.trim(),
        descripcion:`${tipo.trim()} — ${responsable?.trim()||'David'}`,
        tipo:c.toLowerCase().includes('email')?'email':c.toLowerCase().includes('whatsapp')?'whatsapp':c.toLowerCase().includes('ads')||c.toLowerCase().includes('pauta')?'pauta':c.toLowerCase().includes('offline')||c.toLowerCase().includes('stand')?'offline':'contenido',
        canal:c, campana_id:campanaId, color:CANAL_COLORS[c]||'#185fa5', completado:false,
        responsable:responsable?.trim()||'David'
      })
    }
  }
  return tareas
}

function renderMd(text: string) {
  return text
    .replace(/^### (.+)$/gm,'<h3 style="font-size:13px;font-weight:700;color:#1a1a18;margin:16px 0 6px">$1</h3>')
    .replace(/^## (.+)$/gm,'<h2 style="font-size:14px;font-weight:700;color:#1a1a18;margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid #f0efe8">$1</h2>')
    .replace(/^# (.+)$/gm,'<h1 style="font-size:16px;font-weight:700;color:#1a1a18;margin:16px 0 8px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong style="font-weight:600;color:#1a1a18">$1</strong>')
    .replace(/^- (.+)$/gm,'<li style="margin-left:16px;font-size:12px;color:#6b6a63;margin-bottom:4px;list-style:disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm,'<li style="margin-left:16px;font-size:12px;color:#6b6a63;margin-bottom:4px;list-style:decimal">$2</li>')
    .replace(/\n\n/g,'<br/><br/>')
    .replace(/\n/g,'<br/>')
}

function parseBloques(text: string) {
  const parts = text.split(/\[BLOQUE:\s*([^\]]+)\]/)
  const bloques: {title:string;content:string}[] = []
  for (let i=1;i<parts.length;i+=2) {
    if (parts[i]&&parts[i+1]) bloques.push({title:parts[i].trim(),content:parts[i+1].trim()})
  }
  return bloques.length>0 ? bloques : [{title:'Estrategia completa',content:text}]
}

function Chk({label,checked,onClick}:{label:string;checked:boolean;onClick:()=>void}) {
  return (
    <button onClick={onClick} style={{
      display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:8,fontSize:12,
      border:checked?'1px solid #85b7eb':'1px solid #e0dfd5',cursor:'pointer',textAlign:'left',
      background:checked?'#e6f1fb':'transparent',color:checked?'#185fa5':'#6b6a63',fontWeight:checked?500:400,
      fontFamily:'inherit'
    }}>
      <div style={{width:14,height:14,borderRadius:3,border:checked?'none':'1px solid #c0bfb5',
        background:checked?'#185fa5':'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {checked&&<svg viewBox="0 0 10 10" style={{width:10,height:10}}><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
      </div>
      {label}
    </button>
  )
}

export default function CampanasPage() {
  const [step,setStep]=useState(0)
  const [form,setForm]=useState({nombre:'',descripcion:'',fecha_inicio:'',fecha_fin:'',presupuesto:'',evento_relacionado:'',objetivo:'',meta_cuantificable:'',offline:[] as string[],canales:['Meta Ads','Instagram orgánico','Email marketing'] as string[],creadora:'Sí, disponible completo',audiencia:['Corredores urbanos / running'] as string[],notas:''})
  const [output,setOutput]=useState('')
  const [loading,setLoading]=useState(false)
  const [campanas,setCampanas]=useState<Campana[]>([])
  const [openAcc,setOpenAcc]=useState<string|null>('Resumen estratégico y narrativa')
  const [savedId,setSavedId]=useState<string|null>(null)
  const [saving,setSaving]=useState(false)
  const [syncing,setSyncing]=useState(false)
  const [synced,setSynced]=useState(false)
  const [tareasN,setTareasN]=useState(0)
  const [view,setView]=useState<'builder'|'list'|'detail'>('builder')
  const [selected,setSelected]=useState<Campana|null>(null)

  useEffect(()=>{fetchCampanas()},[])
  async function fetchCampanas(){const r=await fetch('/api/campanas');const d=await r.json();setCampanas(Array.isArray(d)?d:[])}
  function tog(arr:string[],v:string){return arr.includes(v)?arr.filter(x=>x!==v):[...arr,v]}

  async function generate(){
    setLoading(true);setOutput('');setSavedId(null);setSynced(false);setStep(4)
    const ev=EVENTOS_CLAVE.find(e=>e.value===form.evento_relacionado)?.label||'Sin evento'
    const prompt=`Crea la estrategia COMPLETA para la campaña de Terret. En el cronograma, cada tarea en este formato exacto:
- DIA: YYYY-MM-DD | CANAL: [canal] | TIPO: [tipo] | TAREA: [descripción] | RESPONSABLE: [David/Creadora/Comité]

CAMPAÑA: ${form.nombre}
QUÉ COMUNICAMOS: ${form.descripcion}
PERÍODO: ${form.fecha_inicio} al ${form.fecha_fin}
PRESUPUESTO: ${form.presupuesto} COP
EVENTO: ${ev}
OBJETIVO: ${form.objetivo}
META: ${form.meta_cuantificable}
OFFLINE: ${form.offline.join(', ')||'Solo digital'}
CANALES: ${form.canales.join(', ')}
CREADORA: ${form.creadora}
AUDIENCIA: ${form.audiencia.join(', ')}
NOTAS: ${form.notas||'Ninguna'}

Genera con estos bloques marcados [BLOQUE: Nombre]:
[BLOQUE: Resumen estratégico y narrativa]
[BLOQUE: Cronograma día a día]
[BLOQUE: Copies y captions — 3 variaciones]
[BLOQUE: Estrategia Meta Ads]
[BLOQUE: Guión video UGC — Hook/Desarrollo/CTA]
[BLOQUE: Emails completos]
[BLOQUE: Secuencia Stories Instagram — 6 slides]
[BLOQUE: Estados y mensajes WhatsApp]
[BLOQUE: Activación offline o en carrera]
[BLOQUE: KPIs y semáforos de éxito]

El cronograma DEBE tener tareas para TODOS los días del período con el formato DIA/CANAL/TIPO/TAREA/RESPONSABLE.`

    const res=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'campana',messages:[{role:'user',content:prompt}]})})
    const reader=res.body!.getReader();const decoder=new TextDecoder();let text=''
    while(true){const{done,value}=await reader.read();if(done)break;text+=decoder.decode(value);setOutput(text)}
    setLoading(false)
  }

  async function save(){
    setSaving(true)
    const res=await fetch('/api/campanas',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({nombre:form.nombre,descripcion:form.descripcion,fecha_inicio:form.fecha_inicio||null,fecha_fin:form.fecha_fin||null,presupuesto:parseFloat(form.presupuesto.replace(/\./g,'').replace(',','.'))||null,evento_relacionado:form.evento_relacionado,objetivo:form.objetivo,meta_cuantificable:form.meta_cuantificable,canales:form.canales,audiencia:form.audiencia,notas:form.notas,output_claude:output,estado:'activa'})})
    const d=await res.json();setSavedId(d.id);setSaving(false);fetchCampanas();return d.id
  }

  async function syncCal(){
    setSyncing(true)
    let cid=savedId;if(!cid)cid=await save()
    if(!cid){setSyncing(false);return}
    const tareas=parsearCronograma(output,cid);setTareasN(tareas.length)
    if(tareas.length>0){
      await fetch(`/api/calendario?campana_id=${cid}`,{method:'DELETE'})
      await fetch('/api/calendario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(tareas)})
    }
    setSyncing(false);setSynced(true)
  }

  const bloques=parseBloques(output)
  const S=(p:{style?:React.CSSProperties;children:React.ReactNode;[k:string]:unknown})=>(<div {...p}/>)

  if(view==='detail'&&selected){
    const db=parseBloques(selected.output_claude||'')
    return(
      <div style={{maxWidth:800,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <button onClick={()=>{setView('list');setSelected(null)}} style={{fontSize:12,color:'#185fa5',background:'none',border:'none',cursor:'pointer'}}>← Volver</button>
          <h1 style={{fontSize:18,fontWeight:600,color:'#1a1a18',margin:0}}>{selected.nombre}</h1>
          <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:600,background:selected.estado==='activa'?'#dcfce7':'#fef3c7',color:selected.estado==='activa'?'#15803d':'#b45309'}}>{selected.estado}</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20}}>
          {[{l:'Período',v:`${selected.fecha_inicio||'—'} → ${selected.fecha_fin||'—'}`},{l:'Objetivo',v:selected.objetivo||'—'},{l:'Presupuesto',v:selected.presupuesto?`$${selected.presupuesto.toLocaleString()} COP`:'—'}].map(m=>(
            <div key={m.l} style={{background:'#f0efe8',borderRadius:8,padding:'12px 14px'}}>
              <div style={{fontSize:10,fontWeight:600,color:'#9c9a92',textTransform:'uppercase',letterSpacing:'.5px'}}>{m.l}</div>
              <div style={{fontSize:12,fontWeight:500,color:'#1a1a18',marginTop:4}}>{m.v}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {db.map(b=>(
            <div key={b.title} style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,overflow:'hidden'}}>
              <button onClick={()=>setOpenAcc(openAcc===b.title?null:b.title)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                <span style={{fontSize:13,fontWeight:600,color:'#1a1a18'}}>{b.title}</span>
                {openAcc===b.title?<ChevronDown size={15}/>:<ChevronRight size={15}/>}
              </button>
              {openAcc===b.title&&<div style={{padding:'0 20px 20px',borderTop:'1px solid #f0efe8'}} dangerouslySetInnerHTML={{__html:renderMd(b.content)}}/>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if(view==='list') return(
    <div style={{maxWidth:800,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div><h1 style={{fontSize:20,fontWeight:600,color:'#1a1a18',margin:0}}>Campañas</h1><p style={{fontSize:13,color:'#6b6a63',margin:'4px 0 0'}}>{campanas.length} guardadas</p></div>
        <button onClick={()=>{setView('builder');setStep(0);setOutput('');setSavedId(null);setSynced(false)}} style={{padding:'8px 16px',background:'#1a1a18',color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Nueva campaña</button>
      </div>
      {campanas.length===0?<div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:48,textAlign:'center',color:'#9c9a92',fontSize:13}}>Sin campañas guardadas.</div>:(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {campanas.map(c=>(
            <div key={c.id} style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:'14px 20px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{flex:1,cursor:'pointer'}} onClick={()=>{setSelected(c);setView('detail');setOpenAcc('Resumen estratégico y narrativa')}}>
                <div style={{fontSize:13,fontWeight:600,color:'#185fa5'}}>{c.nombre}</div>
                <div style={{fontSize:11,color:'#9c9a92',marginTop:2}}>{c.fecha_inicio&&c.fecha_fin?`${c.fecha_inicio} → ${c.fecha_fin}`:'Sin fechas'}{c.objetivo?` · ${c.objetivo}`:''}</div>
              </div>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:600,flexShrink:0,background:c.estado==='activa'?'#dcfce7':'#fef3c7',color:c.estado==='activa'?'#15803d':'#b45309'}}>{c.estado}</span>
              <button onClick={()=>{setSelected(c);setView('detail');setOpenAcc('Resumen estratégico y narrativa')}} style={{padding:'6px 12px',background:'#e6f1fb',color:'#185fa5',border:'none',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Ver campaña</button>
              <button onClick={async()=>{await fetch(`/api/campanas?id=${c.id}`,{method:'DELETE'});fetchCampanas()}} style={{padding:6,background:'none',border:'none',cursor:'pointer',color:'#9c9a92'}}>
                <Trash2 size={13}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const inp=(v:string,onChange:(s:string)=>void,p:string,type='text')=>(
    <input type={type} value={v} onChange={e=>onChange(e.target.value)} placeholder={p} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
  )

  return(
    <div style={{maxWidth:720,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div><h1 style={{fontSize:20,fontWeight:600,color:'#1a1a18',margin:0}}>Constructor de campaña</h1><p style={{fontSize:13,color:'#6b6a63',margin:'4px 0 0'}}>Completa el briefing → Claude genera todo → queda en el calendario.</p></div>
        <button onClick={()=>setView('list')} style={{padding:'7px 14px',border:'1px solid #e0dfd5',borderRadius:8,fontSize:12,color:'#6b6a63',background:'transparent',cursor:'pointer',fontFamily:'inherit'}}>Ver guardadas ({campanas.length})</button>
      </div>

      {/* Steps */}
      <div style={{display:'flex',border:'1px solid #e0dfd5',borderRadius:12,overflow:'hidden',marginBottom:20}}>
        {STEPS.map((s,i)=>(
          <button key={s} onClick={()=>{if(i<step||step===4)setStep(i)}} style={{flex:1,padding:'10px 6px',fontSize:11,fontWeight:600,border:'none',borderRight:i<4?'1px solid #e0dfd5':'none',cursor:'pointer',fontFamily:'inherit',
            background:i===step?'#1a1a18':i<step?'#f0f7ff':'#fff',color:i===step?'#fff':i<step?'#185fa5':'#9c9a92'}}>
            <div style={{width:20,height:20,borderRadius:'50%',margin:'0 auto 4px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,
              background:i===step?'#fff':i<step?'#185fa5':'#f0efe8',color:i===step?'#1a1a18':i<step?'#fff':'#9c9a92'}}>{i+1}</div>
            {s}
          </button>
        ))}
      </div>

      {step===0&&(
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:24,display:'flex',flexDirection:'column',gap:16}}>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Nombre *</label>{inp(form.nombre,v=>setForm(f=>({...f,nombre:v})),'Ej: You Never Run Alone — Maratón Medellín 2026')}</div>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>¿Qué comunicamos?</label><textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Producto, colección, evento..." rows={3} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',resize:'none',outline:'none',boxSizing:'border-box'}}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Fecha inicio</label>{inp(form.fecha_inicio,v=>setForm(f=>({...f,fecha_inicio:v})),'','date')}</div>
            <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Fecha fin</label>{inp(form.fecha_fin,v=>setForm(f=>({...f,fecha_fin:v})),'','date')}</div>
          </div>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Presupuesto (COP)</label>{inp(form.presupuesto,v=>setForm(f=>({...f,presupuesto:v})),'Ej: 2.500.000')}</div>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>¿Relacionada con?</label>
            <select value={form.evento_relacionado} onChange={e=>setForm(f=>({...f,evento_relacionado:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}>
              {EVENTOS_CLAVE.map(e=><option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end'}}><button onClick={()=>setStep(1)} style={{padding:'9px 20px',background:'#1a1a18',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Siguiente →</button></div>
        </div>
      )}

      {step===1&&(
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:24,display:'flex',flexDirection:'column',gap:16}}>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Objetivo principal</label>
            <select value={form.objetivo} onChange={e=>setForm(f=>({...f,objetivo:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}>
              <option value="">Selecciona...</option>
              {['Ventas directas — maximizar ROAS','Lanzamiento de producto — generar awareness','Posicionamiento en carrera o evento','Crecimiento de comunidad y seguidores','Fidelización y recompra','Leads para Terret Merch B2B'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Meta cuantificable</label>{inp(form.meta_cuantificable,v=>setForm(f=>({...f,meta_cuantificable:v})),'Ej: ROAS 7x, 300 unidades, 2.000 seguidores')}</div>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>¿Activación offline?</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {['Stand en carrera / expo','Evento físico / pop-up','Punto de venta','Solo digital'].map(o=><Chk key={o} label={o} checked={form.offline.includes(o)} onClick={()=>setForm(f=>({...f,offline:tog(f.offline,o)}))}/>)}
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}><button onClick={()=>setStep(0)} style={{padding:'9px 16px',border:'1px solid #e0dfd5',borderRadius:8,fontSize:13,color:'#6b6a63',background:'transparent',cursor:'pointer',fontFamily:'inherit'}}>← Atrás</button><button onClick={()=>setStep(2)} style={{padding:'9px 20px',background:'#1a1a18',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Siguiente →</button></div>
        </div>
      )}

      {step===2&&(
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:24,display:'flex',flexDirection:'column',gap:16}}>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>Canales activos</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {['Meta Ads','Google Ads','TikTok Ads','Instagram orgánico','TikTok orgánico','Email marketing','WhatsApp / estados','Influencers / UGC'].map(c=><Chk key={c} label={c} checked={form.canales.includes(c)} onClick={()=>setForm(f=>({...f,canales:tog(f.canales,c)}))}/>)}
            </div>
          </div>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Creadora disponible</label>
            <select value={form.creadora} onChange={e=>setForm(f=>({...f,creadora:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}>
              {['Sí, disponible completo','Sí, disponibilidad parcial','No disponible'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}><button onClick={()=>setStep(1)} style={{padding:'9px 16px',border:'1px solid #e0dfd5',borderRadius:8,fontSize:13,color:'#6b6a63',background:'transparent',cursor:'pointer',fontFamily:'inherit'}}>← Atrás</button><button onClick={()=>setStep(3)} style={{padding:'9px 20px',background:'#1a1a18',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Siguiente →</button></div>
        </div>
      )}

      {step===3&&(
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:24,display:'flex',flexDirection:'column',gap:16}}>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>Audiencia objetivo</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {['Corredores urbanos / running','Ciclistas','Fitness / gym','Compradores de regalo','Base de clientes Terret','Equipos deportivos'].map(a=><Chk key={a} label={a} checked={form.audiencia.includes(a)} onClick={()=>setForm(f=>({...f,audiencia:tog(f.audiencia,a)}))}/>)}
            </div>
          </div>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Notas o restricciones</label>
            <textarea value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} placeholder="Stock limitado, no usar rojo, competencia lanzó algo similar..." rows={3} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',resize:'none',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}><button onClick={()=>setStep(2)} style={{padding:'9px 16px',border:'1px solid #e0dfd5',borderRadius:8,fontSize:13,color:'#6b6a63',background:'transparent',cursor:'pointer',fontFamily:'inherit'}}>← Atrás</button>
            <button onClick={generate} disabled={!form.nombre} style={{padding:'9px 20px',background:form.nombre?'#1a1a18':'#9c9a92',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:form.nombre?'pointer':'default',fontFamily:'inherit',display:'flex',alignItems:'center',gap:8}}>
              ✦ Generar estrategia completa
            </button>
          </div>
        </div>
      )}

      {step===4&&(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {loading&&!output&&(
            <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:24,display:'flex',alignItems:'center',gap:12,color:'#185fa5'}}>
              <Loader2 size={16} className="animate-spin"/>
              <span style={{fontSize:13}}>Construyendo estrategia completa — ~30 segundos...</span>
            </div>
          )}
          {output&&(
            <>
              <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:16,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                <div style={{fontSize:13,fontWeight:600,color:'#1a1a18'}}>{form.nombre}</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {!savedId&&!saving&&(<button onClick={save} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'#1a1a18',color:'#fff',border:'none',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}><Save size={12}/>Guardar campaña</button>)}
                  {saving&&(<span style={{fontSize:11,color:'#9c9a92',padding:'7px 14px'}}>Guardando...</span>)}
                  {savedId&&!synced&&(<button onClick={syncCal} disabled={syncing} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'#e6f1fb',color:'#185fa5',border:'none',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                    {syncing?<Loader2 size={12} className="animate-spin"/>:<Calendar size={12}/>}
                    {syncing?'Sincronizando...':'Poner en calendario'}
                  </button>)}
                  {synced&&(<div style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'#dcfce7',color:'#15803d',borderRadius:8,fontSize:11,fontWeight:600}}><CheckCircle size={12}/>{tareasN} tareas en calendario</div>)}
                  <button onClick={()=>navigator.clipboard.writeText(output)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',border:'1px solid #e0dfd5',borderRadius:8,fontSize:11,color:'#6b6a63',background:'transparent',cursor:'pointer',fontFamily:'inherit'}}><Copy size={11}/>Copiar</button>
                  <button onClick={()=>{setStep(0);setOutput('');setSavedId(null);setSynced(false)}} style={{padding:'7px 12px',border:'1px solid #e0dfd5',borderRadius:8,fontSize:11,color:'#6b6a63',background:'transparent',cursor:'pointer',fontFamily:'inherit'}}>Nueva</button>
                </div>
              </div>
              {bloques.map(b=>(
                <div key={b.title} style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,overflow:'hidden'}}>
                  <button onClick={()=>setOpenAcc(openAcc===b.title?null:b.title)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#1a1a18'}}>{b.title}</span>
                    {openAcc===b.title?<ChevronDown size={15}/>:<ChevronRight size={15}/>}
                  </button>
                  {openAcc===b.title&&<div style={{padding:'0 20px 20px',borderTop:'1px solid #f0efe8'}} dangerouslySetInnerHTML={{__html:renderMd(b.content)}}/>}
                </div>
              ))}
              {loading&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'#185fa5',padding:'0 4px'}}><Loader2 size={12} className="animate-spin"/>Generando...</div>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
