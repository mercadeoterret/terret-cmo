'use client'
import { useState } from 'react'
import { Loader2, Copy, RefreshCw } from 'lucide-react'
const TIPOS=[{v:'caption',l:'Caption Instagram / TikTok'},{v:'script_ugc',l:'Guión video UGC completo'},{v:'carrusel',l:'Carrusel completo (slide por slide)'},{v:'email',l:'Email marketing completo'},{v:'stories',l:'Secuencia Stories (6 slides)'},{v:'whatsapp',l:'Estado WhatsApp'},{v:'brief_creator',l:'Brief para creadora'},{v:'ads_meta',l:'Copy Meta Ads (3 variaciones)'},{v:'ads_google',l:'Google Search Ads'},{v:'reel_15',l:'Script reel 15 segundos'}]
const TONOS=['Técnico y aspiracional','Cercano y motivador','Urgente / oferta','Storytelling corredor','Orgullo colombiano','Educativo']
export default function ContenidoPage(){
  const [form,setForm]=useState({tipo:'caption',producto:'',tono:TONOS[0],evento:'',ctx:''})
  const [out,setOut]=useState('');const [loading,setLoading]=useState(false);const [lastP,setLastP]=useState('')
  async function gen(regen=false){
    setLoading(true);setOut('')
    const tl=TIPOS.find(t=>t.v===form.tipo)?.l||form.tipo
    const p=regen?lastP+' Genera una versión completamente diferente.':
      `Genera ${tl} para Terret sobre: "${form.producto||'la marca Terret'}".
Tono: ${form.tono}.${form.evento?`\nFecha/evento: ${form.evento}.`:''}${form.ctx?`\nContexto/CTA: ${form.ctx}`:''} 

${form.tipo==='carrusel'?'Genera el carrusel COMPLETO slide por slide:\n- Slide 1 (portada): Texto exacto + descripción visual\n- Slides 2-7: Texto exacto de cada slide con descripción de qué mostrar\n- Slide final: CTA exacto\nCada slide con máximo 7 palabras de texto grande. Instrucciones visuales detalladas.':
form.tipo==='script_ugc'?'Formato COMPLETO:\n**HOOK (0-3s):** Texto exacto + acción visual\n**DESARROLLO (4-45s):** Escena por escena\n**CTA (últimos 5s):** Texto exacto\n**LOCACIÓN:** Dónde grabar específico\n**VESTUARIO:** Qué ropa Terret usar\n**MÚSICA:** Artista - Canción específica + qué parte usar':
form.tipo==='email'?'Email COMPLETO:\n- ASUNTO A y B (para A/B test)\n- PREHEADER\n- CUERPO COMPLETO (listo para copiar)\n- CTA (texto del botón + URL)':
form.tipo==='ads_meta'?'3 variaciones:\n1. Racional/técnica\n2. Emocional/aspiracional\n3. Urgencia/oferta\nCada una con: Texto principal (125 chars), Titular (40 chars), Descripción (30 chars)':
form.tipo==='stories'?'6 slides numerados:\nCada slide: Texto en pantalla (máx 6 palabras) + Sticker sugerido + descripción visual + CTA':
'Contenido COMPLETO, específico, listo para usar SIN editar. En voz de Terret. Con hashtags si aplica.'}

NUNCA "Térret". Todo listo para copiar y publicar directamente.`
    setLastP(p)
    const r=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'contenido',messages:[{role:'user',content:p}]})})
    const reader=r.body!.getReader();const dec=new TextDecoder();let text=''
    while(true){const{done,value}=await reader.read();if(done)break;text+=dec.decode(value);setOut(text)}
    setLoading(false)
  }
  const s=(style:React.CSSProperties)=>style
  const lbl=s({display:'block',fontSize:10,fontWeight:700,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6})
  const inp=s({width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff',color:'#1a1a18'})
  return(
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      <div style={{marginBottom:20}}><h1 style={{fontSize:22,fontWeight:800,color:'#1a1a18',margin:0}}>Copies y guiones</h1><p style={{fontSize:13,color:'#6b6a63',margin:'4px 0 0'}}>Todo listo para copiar y usar directamente. Sin editar.</p></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20,display:'flex',flexDirection:'column',gap:14}}>
          {([['Tipo de pieza',<select key="t" value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inp}>{TIPOS.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select>],
            ['Producto o tema *',<input key="p" value={form.producto} onChange={e=>setForm(f=>({...f,producto:e.target.value}))} placeholder="Ej: Tobilleras de compresión Running Pro" style={inp}/>],
            ['Tono',<select key="tn" value={form.tono} onChange={e=>setForm(f=>({...f,tono:e.target.value}))} style={inp}>{TONOS.map(t=><option key={t}>{t}</option>)}</select>],
            ['Fecha relacionada',<input key="ev" value={form.evento} onChange={e=>setForm(f=>({...f,evento:e.target.value}))} placeholder="Ej: Maratón Medellín, Amor y Amistad..." style={inp}/>],
            ['CTA o contexto',<textarea key="ctx" value={form.ctx} onChange={e=>setForm(f=>({...f,ctx:e.target.value}))} placeholder="Descuento activo, stock limitado, link en bio..." rows={2} style={{...inp,resize:'none' as const}}/>]
          ] as [string, React.ReactNode][]).map(([l,el])=>(
            <div key={l}><label style={lbl}>{l}</label>{el}</div>
          ))}
          <button onClick={()=>gen()} disabled={loading} style={{padding:'11px',background:'#1a1a18',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {loading?<Loader2 size={14} className="animate-spin"/>:'✦'} Generar
          </button>
        </div>
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700,color:'#1a1a18'}}>Resultado</div>
            {out&&<div style={{display:'flex',gap:8}}>
              <button onClick={()=>navigator.clipboard.writeText(out)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',border:'1px solid #e0dfd5',borderRadius:7,fontSize:11,fontWeight:700,color:'#6b6a63',background:'#fff',cursor:'pointer',fontFamily:'inherit'}}><Copy size={11}/>Copiar</button>
              <button onClick={()=>gen(true)} disabled={loading} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'#e6f1fb',color:'#185fa5',border:'none',borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><RefreshCw size={11}/>Otra versión</button>
            </div>}
          </div>
          {loading&&!out&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#185fa5'}}><Loader2 size={13} className="animate-spin"/>Generando...</div>}
          <div style={{fontSize:13,color:out?'#1a1a18':'#9c9a92',lineHeight:1.7,whiteSpace:'pre-wrap',minHeight:400,fontStyle:out?'normal':'italic'}}>{out||'El contenido aparecerá aquí completo y listo para usar...'}</div>
        </div>
      </div>
    </div>
  )
}
