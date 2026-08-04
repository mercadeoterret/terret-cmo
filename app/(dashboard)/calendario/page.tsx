'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, parseISO, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, Check, Sparkles, Loader2, Bell } from 'lucide-react'
import { RACES_CO, COMMERCIAL_DATES, RACES_INTL } from '@/lib/terret-context'

const TIPO_COLORS: Record<string,string>={contenido:'#7c3aed',pauta:'#185fa5',email:'#15803d',whatsapp:'#16a34a',offline:'#b45309',campana:'#dc2626'}
const TIPO_LABELS: Record<string,string>={contenido:'Contenido',pauta:'Pauta',email:'Email',whatsapp:'WhatsApp',offline:'Offline',campana:'Campaña'}

interface Evento{id?:string;fecha:string;titulo:string;descripcion?:string;tipo:string;canal?:string;completado?:boolean;color?:string;campana_id?:string;source?:string}

export default function CalendarioPage(){
  const [cur,setCur]=useState(new Date())
  const [eventos,setEventos]=useState<Evento[]>([])
  const [selDay,setSelDay]=useState<string|null>(null)
  const [addOpen,setAddOpen]=useState(false)
  const [loadPlan,setLoadPlan]=useState(false)
  const [planText,setPlanText]=useState('')
  const [form,setForm]=useState({titulo:'',descripcion:'',tipo:'contenido',canal:'',completado:false})
  const [notif,setNotif]=useState('default')

  const ms=startOfMonth(cur),me=endOfMonth(cur)
  const days=eachDayOfInterval({start:ms,end:me})
  const pad=(getDay(ms)+6)%7

  const load=useCallback(async()=>{
    const from=format(ms,'yyyy-MM-dd'),to=format(me,'yyyy-MM-dd')
    const r=await fetch(`/api/calendario?from=${from}&to=${to}`)
    const d=await r.json()
    setEventos(Array.isArray(d)?d.map((e:Evento)=>({...e,source:'db'})):[])
  },[cur])

  useEffect(()=>{load()},[load])
  useEffect(()=>{'Notification' in window&&setNotif(Notification.permission)},[])

  async function reqNotif(){
    if(!('Notification' in window))return
    const p=await Notification.requestPermission();setNotif(p)
    if(p==='granted') new Notification('Terret CMO',{body:'Notificaciones activas ✓',icon:'/icon-192.png'})
  }

  function getEvs(dateStr:string):Evento[]{
    const all:Evento[]=[]
    eventos.filter(e=>e.fecha===dateStr).forEach(e=>all.push(e))
    RACES_CO.filter(r=>r.date===dateStr).forEach(r=>all.push({fecha:dateStr,titulo:r.name,descripcion:`📍 ${r.city} | ${r.dist}`,tipo:'offline',source:'race',color:'#dc2626'}))
    COMMERCIAL_DATES.filter(f=>f.date===dateStr).forEach(f=>all.push({fecha:dateStr,titulo:f.name,tipo:'campana',source:'commercial',color:f.type==='commercial'?'#b45309':'#7c3aed'}))
    RACES_INTL.filter(r=>r.date===dateStr).forEach(r=>all.push({fecha:dateStr,titulo:`🌎 ${r.name}`,descripcion:r.city,tipo:'offline',source:'intl',color:'#185fa5'}))
    return all
  }

  async function saveEv(){
    if(!form.titulo||!selDay)return
    await fetch('/api/calendario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,fecha:selDay,color:TIPO_COLORS[form.tipo]})})
    setAddOpen(false);setForm({titulo:'',descripcion:'',tipo:'contenido',canal:'',completado:false});load()
  }
  async function toggleDone(id:string,done:boolean){await fetch('/api/calendario',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,completado:!done})});load()}
  async function delEv(id:string){await fetch(`/api/calendario?id=${id}`,{method:'DELETE'});load()}

  async function genPlan(){
    setLoadPlan(true);setPlanText('')
    const mes=format(cur,"MMMM 'de' yyyy",{locale:es})
    const ms2=format(ms,'yyyy-MM')
    const evs=[...RACES_CO.filter(r=>r.date.startsWith(ms2)),...COMMERCIAL_DATES.filter(f=>f.date.startsWith(ms2))]
    const res=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'calendario',messages:[{role:'user',content:`Genera el plan editorial de Terret para ${mes}. Eventos: ${evs.map(e=>'name' in e?e.name:'').filter(Boolean).join(', ')||'ninguno especial'}. Incluye días de publicación por canal, tipo de contenido y tema específico. Sé concreto con fechas reales.`}]})})
    const reader=res.body!.getReader();const decoder=new TextDecoder();let text=''
    while(true){const{done,value}=await reader.read();if(done)break;text+=decoder.decode(value);setPlanText(text)}
    setLoadPlan(false)
  }

  const todayStr=format(new Date(),'yyyy-MM-dd')
  const todayEvs=getEvs(todayStr).filter(e=>e.source==='db')
  const selEvs=selDay?getEvs(selDay):[]

  const dayNames=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

  return(
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div><h1 style={{fontSize:20,fontWeight:600,color:'#1a1a18',margin:0}}>Calendario editorial</h1><p style={{fontSize:13,color:'#6b6a63',margin:'4px 0 0'}}>Tareas de campañas, carreras y fechas comerciales.</p></div>
        <div style={{display:'flex',gap:8}}>
          {notif!=='granted'&&(<button onClick={reqNotif} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:'1px solid #e0dfd5',borderRadius:8,fontSize:11,color:'#6b6a63',background:'transparent',cursor:'pointer',fontFamily:'inherit'}}><Bell size={12}/>Activar notificaciones</button>)}
          <button onClick={genPlan} disabled={loadPlan} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'#e6f1fb',color:'#185fa5',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
            {loadPlan?<Loader2 size={13} className="animate-spin"/>:<Sparkles size={13}/>}Generar plan del mes
          </button>
        </div>
      </div>

      {todayEvs.length>0&&(
        <div style={{background:'#fffbf0',border:'1px solid #fde68a',borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:600,color:'#92400e',marginBottom:8}}>📌 HOY — {format(new Date(),"d 'de' MMMM",{locale:es})}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {todayEvs.map((e,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'#fff',borderRadius:8,border:'1px solid #fde68a',fontSize:11}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:e.color||TIPO_COLORS[e.tipo]||'#185fa5'}}/>
                <span style={{fontWeight:500,textDecoration:e.completado?'line-through':undefined,opacity:e.completado?.5:1}}>{e.titulo}</span>
                {e.canal&&<span style={{color:'#9c9a92'}}>· {e.canal}</span>}
                {e.id&&<button onClick={()=>toggleDone(e.id!,e.completado||false)} style={{background:'none',border:'none',cursor:'pointer',color:e.completado?'#15803d':'#c0bfb5',padding:2}}><Check size={11}/></button>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20,marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button onClick={()=>setCur(subMonths(cur,1))} style={{padding:'6px 10px',border:'1px solid #e0dfd5',borderRadius:8,background:'transparent',cursor:'pointer'}}><ChevronLeft size={15}/></button>
            <h2 style={{fontSize:15,fontWeight:600,color:'#1a1a18',minWidth:180,textAlign:'center',margin:0}}>
              {format(cur,"MMMM 'de' yyyy",{locale:es}).replace(/^\w/,c=>c.toUpperCase())}
            </h2>
            <button onClick={()=>setCur(addMonths(cur,1))} style={{padding:'6px 10px',border:'1px solid #e0dfd5',borderRadius:8,background:'transparent',cursor:'pointer'}}><ChevronRight size={15}/></button>
          </div>
          <div style={{display:'flex',gap:12,fontSize:10,color:'#6b6a63',flexWrap:'wrap'}}>
            {[['#fca5a5','Carrera CO'],['#fde68a','Comercial'],['#ddd6fe','Contenido'],['#bfdbfe','Pauta'],['#a7f3d0','Email']].map(([c,l])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:2,background:c}}/>{l}</div>
            ))}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:4}}>
          {dayNames.map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:600,color:'#9c9a92',textTransform:'uppercase',letterSpacing:'.4px',padding:'4px 0'}}>{d}</div>)}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
          {Array.from({length:pad}).map((_,i)=><div key={`p${i}`} style={{minHeight:80,borderRadius:8,background:'#f0efe8',opacity:.2}}/>)}
          {days.map(day=>{
            const ds=format(day,'yyyy-MM-dd')
            const evs=getEvs(ds)
            const dbEvs=evs.filter(e=>e.source==='db')
            const allDone=dbEvs.length>0&&dbEvs.every(e=>e.completado)
            return(
              <div key={ds} onClick={()=>setSelDay(ds)}
                style={{minHeight:80,borderRadius:8,padding:'6px',cursor:'pointer',position:'relative',
                  background:isToday(day)?'#fff':evs.length?'#fff':'#f0efe8',
                  border:isToday(day)?'1.5px solid #185fa5':evs.length?'1px solid #e0dfd5':'none',
                  transition:'border-color .1s'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:600,color:isToday(day)?'#185fa5':'#6b6a63'}}>{format(day,'d')}</span>
                  <div style={{display:'flex',alignItems:'center',gap:3}}>
                    {allDone&&<div style={{width:12,height:12,borderRadius:'50%',background:'#15803d',display:'flex',alignItems:'center',justifyContent:'center'}}><Check size={8} color="white"/></div>}
                    <button onClick={e=>{e.stopPropagation();setSelDay(ds);setAddOpen(true)}} style={{opacity:0,background:'none',border:'none',cursor:'pointer',padding:2}} className="group-hover:opacity-100">
                      <Plus size={10} color="#6b6a63"/>
                    </button>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:2}}>
                  {evs.slice(0,3).map((ev,i)=>(
                    <div key={i} style={{fontSize:8,padding:'1px 4px',borderRadius:3,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',fontWeight:500,
                      opacity:ev.completado?.4:1,textDecoration:ev.completado?'line-through':undefined,
                      background:(ev.color||TIPO_COLORS[ev.tipo]||'#185fa5')+'25',
                      color:ev.color||TIPO_COLORS[ev.tipo]||'#185fa5'}}>{ev.titulo}</div>
                  ))}
                  {evs.length>3&&<div style={{fontSize:8,color:'#9c9a92',padding:'0 4px'}}>+{evs.length-3} más</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {(loadPlan||planText)&&(
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20,marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:'#1a1a18',marginBottom:12,display:'flex',alignItems:'center',gap:8}}><Sparkles size={13} color="#185fa5"/>Plan editorial generado por IA</div>
          {loadPlan&&!planText&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#185fa5'}}><Loader2 size={13} className="animate-spin"/>Generando plan...</div>}
          <div style={{fontSize:12,color:'#6b6a63',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{planText}</div>
        </div>
      )}

      {/* Modal día */}
      {selDay&&!addOpen&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:20}} onClick={()=>setSelDay(null)}>
          <div style={{background:'#fff',borderRadius:16,padding:24,width:'100%',maxWidth:480,maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:600,color:'#1a1a18'}}>
                  {format(parseISO(selDay),"EEEE d 'de' MMMM",{locale:es}).replace(/^\w/,c=>c.toUpperCase())}
                </div>
                <div style={{fontSize:11,color:'#9c9a92',marginTop:2}}>{selEvs.length} eventos</div>
              </div>
              <button onClick={()=>setSelDay(null)} style={{padding:6,background:'none',border:'none',cursor:'pointer'}}><X size={16}/></button>
            </div>

            {selEvs.length===0?<p style={{fontSize:12,color:'#9c9a92',textAlign:'center',padding:'24px 0'}}>Sin eventos este día.</p>:(
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                {selEvs.map((ev,i)=>(
                  <div key={i} style={{padding:'12px',borderRadius:10,border:'1px solid #e0dfd5',display:'flex',alignItems:'flex-start',gap:12,opacity:ev.completado?.6:1}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:ev.color||TIPO_COLORS[ev.tipo]||'#185fa5',marginTop:4,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#1a1a18',textDecoration:ev.completado?'line-through':undefined}}>{ev.titulo}</div>
                      {ev.descripcion&&<div style={{fontSize:11,color:'#6b6a63',marginTop:2}}>{ev.descripcion}</div>}
                      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6,flexWrap:'wrap'}}>
                        <span style={{fontSize:9,padding:'2px 7px',borderRadius:20,fontWeight:500,
                          background:(ev.color||TIPO_COLORS[ev.tipo]||'#185fa5')+'20',
                          color:ev.color||TIPO_COLORS[ev.tipo]||'#185fa5'}}>
                          {ev.source==='race'?'🏃 Carrera CO':ev.source==='intl'?'🌎 Internacional':ev.source==='commercial'?'📅 Fecha comercial':TIPO_LABELS[ev.tipo]||ev.tipo}
                        </span>
                        {ev.canal&&<span style={{fontSize:9,color:'#9c9a92'}}>{ev.canal}</span>}
                      </div>
                    </div>
                    {ev.source==='db'&&ev.id&&(
                      <div style={{display:'flex',gap:4,flexShrink:0}}>
                        <button onClick={()=>toggleDone(ev.id!,ev.completado||false)} style={{padding:6,background:ev.completado?'#dcfce7':'transparent',borderRadius:6,border:'none',cursor:'pointer',color:ev.completado?'#15803d':'#9c9a92'}}><Check size={13}/></button>
                        <button onClick={()=>delEv(ev.id!)} style={{padding:6,background:'transparent',border:'none',cursor:'pointer',color:'#9c9a92'}}><X size={13}/></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={()=>setAddOpen(true)} style={{width:'100%',padding:'9px',border:'1px dashed #c0bfb5',borderRadius:8,fontSize:12,color:'#6b6a63',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontFamily:'inherit'}}>
              <Plus size={13}/>Agregar evento manual
            </button>
          </div>
        </div>
      )}

      {/* Modal agregar */}
      {addOpen&&selDay&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:20}} onClick={()=>setAddOpen(false)}>
          <div style={{background:'#fff',borderRadius:16,padding:24,width:'100%',maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1a1a18'}}>Agregar — {format(parseISO(selDay),"d 'de' MMMM",{locale:es})}</div>
              <button onClick={()=>setAddOpen(false)} style={{padding:4,background:'none',border:'none',cursor:'pointer'}}><X size={15}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:5}}>Título *</label>
                <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Ej: Reel tobilleras running"
                  style={{width:'100%',padding:'8px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:5}}>Tipo</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                  {Object.keys(TIPO_LABELS).map(t=>(
                    <button key={t} onClick={()=>setForm(f=>({...f,tipo:t}))}
                      style={{padding:'7px 4px',borderRadius:8,fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:'none',
                        background:form.tipo===t?TIPO_COLORS[t]:'#f0efe8',color:form.tipo===t?'#fff':'#6b6a63'}}>
                      {TIPO_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:5}}>Canal</label>
                <select value={form.canal} onChange={e=>setForm(f=>({...f,canal:e.target.value}))}
                  style={{width:'100%',padding:'8px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}>
                  <option value="">— Sin canal —</option>
                  {['Instagram','TikTok','Meta Ads','Google Ads','Email','WhatsApp','Offline'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:5}}>Descripción</label>
                <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Copy a usar, referencia visual..." rows={2}
                  style={{width:'100%',padding:'8px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',resize:'none',outline:'none',boxSizing:'border-box'}}/>
              </div>
            </div>
            <button onClick={saveEv} style={{marginTop:16,width:'100%',padding:10,background:'#1a1a18',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              Guardar evento
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
