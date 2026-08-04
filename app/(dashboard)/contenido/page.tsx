'use client'
import { useState } from 'react'
import { Loader2, Copy, RefreshCw } from 'lucide-react'
const TIPOS=[{v:'caption',l:'Caption Instagram / TikTok'},{v:'script_ugc',l:'Guión video UGC'},{v:'script_reel',l:'Script reel motivacional'},{v:'email',l:'Email marketing completo'},{v:'stories',l:'Secuencia Stories (6+ slides)'},{v:'whatsapp',l:'Estado / mensaje WhatsApp'},{v:'brief_creator',l:'Brief para creadora'},{v:'ads_meta',l:'Copy Meta Ads'},{v:'ads_tiktok',l:'Copy TikTok Ads'},{v:'ads_google',l:'Textos Google Ads'}]
const TONOS=['Técnico y aspiracional','Cercano y motivador','Urgente / oferta temporal','Storytelling desde el corredor','Orgullo colombiano / running','Educativo / informativo']
const EVENTOS=['','Maratón de Medellín — 5-6 sep 2026','Media Maratón Bogotá — 26 jul 2026','Maratón de Cali — 2-3 may 2026','Amor y Amistad — 20 sep','Día de la Madre — 10 may','Día del Padre — 21 jun','Black Friday Colombia — 5-7 jun','Hot Sale Colombia','Temporada navideña']
export default function ContenidoPage(){
  const [form,setForm]=useState({tipo:'caption',producto:'',tono:TONOS[0],evento:'',ctx:''})
  const [out,setOut]=useState('');const [loading,setLoading]=useState(false);const [lastP,setLastP]=useState('')
  async function gen(regen=false){
    setLoading(true);setOut('')
    const tl=TIPOS.find(t=>t.v===form.tipo)?.l||form.tipo
    const p=regen?lastP+' Genera versión diferente con otro ángulo.':`Genera ${tl} para Terret sobre: "${form.producto||'la marca Terret'}". Tono: ${form.tono}.${form.evento?` Fecha/evento: ${form.evento}.`:''}${form.ctx?` Contexto: ${form.ctx}.`:''} ${form.tipo==='caption'?'3 variaciones con gancho, texto y hashtags.':form.tipo==='script_ugc'?'Hook (3s) → Desarrollo (4-30s) → CTA. Con locación y música.':form.tipo==='email'?'Asunto (3 variantes A/B/C), preheader, cuerpo completo, CTA.':form.tipo==='stories'?'Mínimo 6 slides con texto, sticker y CTA.':form.tipo==='ads_meta'?'3 variaciones: racional, emocional, urgencia.':form.tipo==='ads_google'?'5 headlines (30 chars) + 2 descriptions (90 chars) + 15 keywords.':'Contenido completo listo para usar.'} NUNCA "Térret". Específico para runner colombiano.`
    setLastP(p)
    const r=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'contenido',messages:[{role:'user',content:p}]})})
    const reader=r.body!.getReader();const dec=new TextDecoder();let text=''
    while(true){const{done,value}=await reader.read();if(done)break;text+=dec.decode(value);setOut(text)}
    setLoading(false)
  }
  const s=(style:object)=>style
  return(
    <div style={{maxWidth:1000,margin:'0 auto'}}>
      <div style={{marginBottom:20}}><h1 style={{fontSize:20,fontWeight:600,color:'#1a1a18',margin:0}}>Copies y guiones</h1><p style={{fontSize:13,color:'#6b6a63',margin:'4px 0 0'}}>Genera cualquier pieza de contenido en la voz de Terret.</p></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20,display:'flex',flexDirection:'column',gap:14}}>
          {[['Tipo',<select key="t" value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}>{TIPOS.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select>],
             ['Producto o tema *',<input key="p" value={form.producto} onChange={e=>setForm(f=>({...f,producto:e.target.value}))} placeholder="Ej: Tobilleras de compresión Running Pro" style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box' as const}}/>],
             ['Tono',<select key="tn" value={form.tono} onChange={e=>setForm(f=>({...f,tono:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}>{TONOS.map(t=><option key={t}>{t}</option>)}</select>],
             ['Fecha relacionada',<select key="ev" value={form.evento} onChange={e=>setForm(f=>({...f,evento:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}>{EVENTOS.map(e=><option key={e} value={e}>{e||'— Sin relación —'}</option>)}</select>],
             ['CTA o contexto',<textarea key="ctx" value={form.ctx} onChange={e=>setForm(f=>({...f,ctx:e.target.value}))} placeholder="Descuento activo, link en bio, stock limitado..." rows={2} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',resize:'none' as const,outline:'none',boxSizing:'border-box' as const}}/>]
          ].map(([l,el])=>(
            <div key={l as string}><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase' as const,letterSpacing:'.5px',marginBottom:5}}>{l}</label>{el}</div>
          ))}
          <button onClick={()=>gen()} disabled={loading} style={{padding:'10px',background:'#1a1a18',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {loading?<Loader2 size={14} className="animate-spin"/>:'✦'} Generar
          </button>
        </div>
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:'#1a1a18'}}>Resultado</div>
            {out&&<div style={{display:'flex',gap:8}}>
              <button onClick={()=>navigator.clipboard.writeText(out)} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',border:'1px solid #e0dfd5',borderRadius:7,fontSize:11,color:'#6b6a63',background:'transparent',cursor:'pointer',fontFamily:'inherit'}}><Copy size={11}/>Copiar</button>
              <button onClick={()=>gen(true)} disabled={loading} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:'#e6f1fb',color:'#185fa5',border:'none',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}><RefreshCw size={11}/>Otra versión</button>
            </div>}
          </div>
          {loading&&!out&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#185fa5'}}><Loader2 size={13} className="animate-spin"/>Generando...</div>}
          <div style={{fontSize:12,color:out?'#1a1a18':'#9c9a92',lineHeight:1.7,whiteSpace:'pre-wrap',minHeight:360,fontStyle:out?'normal':'italic'}}>{out||'El contenido aparecerá aquí...'}</div>
        </div>
      </div>
    </div>
  )
}
