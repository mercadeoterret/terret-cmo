'use client'
import { useState } from 'react'
import { Loader2, Copy } from 'lucide-react'
export default function ComitePage(){
  const [q,setQ]=useState('');const [ctx,setCtx]=useState('');const [out,setOut]=useState('');const [loading,setLoading]=useState(false)
  async function gen(){
    if(!q)return;setLoading(true);setOut('')
    const p=`El comité de marketing de Terret necesita una propuesta ejecutiva sobre: "${q}".${ctx?` Contexto: ${ctx}`:''} Genera: 1. RESUMEN EJECUTIVO (3-4 líneas). 2. SITUACIÓN ACTUAL. 3. RECOMENDACIÓN DEL CMO (clara, sin ambigüedades). 4. OPCIONES A EVALUAR (mínimo 2, con pros, contras, inversión, riesgo). 5. RECURSOS NECESARIOS. 6. KPIs DE ÉXITO (máx 3 en lenguaje simple). 7. PRÓXIMOS PASOS (3 acciones con responsable y fecha). Lenguaje accesible, explica métricas técnicas entre paréntesis.`
    const r=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'comite',messages:[{role:'user',content:p}]})})
    const reader=r.body!.getReader();const dec=new TextDecoder();let text=''
    while(true){const{done,value}=await reader.read();if(done)break;text+=dec.decode(value);setOut(text)}
    setLoading(false)
  }
  return(
    <div style={{maxWidth:1000,margin:'0 auto'}}>
      <div style={{marginBottom:20}}><h1 style={{fontSize:20,fontWeight:600,color:'#1a1a18',margin:0}}>Modo comité</h1><p style={{fontSize:13,color:'#6b6a63',margin:'4px 0 0'}}>Propuestas ejecutivas en lenguaje accesible para el comité de marketing.</p></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20,display:'flex',flexDirection:'column',gap:14}}>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5}}>Pregunta o tema *</label>
            <textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="Ej: ¿Deberíamos hacer un stand en el Maratón de Medellín? ¿Vale la inversión?" rows={4} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',resize:'none',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5}}>Contexto adicional</label>
            <textarea value={ctx} onChange={e=>setCtx(e.target.value)} placeholder="Presupuesto disponible, situación actual, competencia..." rows={3} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',resize:'none',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <button onClick={gen} disabled={loading||!q} style={{padding:'10px',background:q?'#1a1a18':'#9c9a92',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:q?'pointer':'default',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {loading?<Loader2 size={14} className="animate-spin"/>:'✦'} Generar propuesta
          </button>
        </div>
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:'#1a1a18'}}>Propuesta generada</div>
            {out&&<button onClick={()=>navigator.clipboard.writeText(out)} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',border:'1px solid #e0dfd5',borderRadius:7,fontSize:11,color:'#6b6a63',background:'transparent',cursor:'pointer',fontFamily:'inherit'}}><Copy size={11}/>Copiar</button>}
          </div>
          {loading&&!out&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#185fa5'}}><Loader2 size={13} className="animate-spin"/>Preparando propuesta...</div>}
          <div style={{fontSize:12,color:out?'#1a1a18':'#9c9a92',lineHeight:1.7,whiteSpace:'pre-wrap',minHeight:360,fontStyle:out?'normal':'italic'}}>{out||'La propuesta aparecerá aquí...'}</div>
        </div>
      </div>
    </div>
  )
}
