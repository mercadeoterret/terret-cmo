'use client'
import { useState } from 'react'
import { Loader2, Copy } from 'lucide-react'
export default function ComitePage(){
  const [q,setQ]=useState('');const [ctx,setCtx]=useState('');const [out,setOut]=useState('');const [loading,setLoading]=useState(false)
  const lbl:React.CSSProperties={display:'block',fontSize:10,fontWeight:700,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}
  async function gen(){if(!q)return;setLoading(true);setOut('');const p=`El comité de marketing de Terret necesita una propuesta ejecutiva sobre: "${q}".${ctx?`\nContexto: ${ctx}`:''}\n\nGenera propuesta con:\n1. RESUMEN EJECUTIVO (3-4 líneas)\n2. SITUACIÓN ACTUAL\n3. RECOMENDACIÓN DEL CMO (clara, sin ambigüedades)\n4. OPCIONES A EVALUAR (mínimo 2, con pros, contras, inversión, riesgo)\n5. RECURSOS NECESARIOS (quién, tiempo, dinero)\n6. KPIs DE ÉXITO (máx 3 en lenguaje simple)\n7. PRÓXIMOS PASOS (3 acciones con responsable y fecha)\n\nLenguaje accesible. Explica métricas técnicas entre paréntesis.`;const r=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'comite',messages:[{role:'user',content:p}]})});const reader=r.body!.getReader();const dec=new TextDecoder();let text='';while(true){const{done,value}=await reader.read();if(done)break;text+=dec.decode(value);setOut(text)};setLoading(false)}
  return(
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      <div style={{marginBottom:20}}><h1 style={{fontSize:22,fontWeight:800,color:'#1a1a18',margin:0}}>Modo comité</h1><p style={{fontSize:13,color:'#6b6a63',margin:'4px 0 0'}}>Propuestas ejecutivas en lenguaje accesible para el comité.</p></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20,display:'flex',flexDirection:'column',gap:14}}>
          <div><label style={lbl}>Pregunta o tema para el comité *</label><textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="Ej: ¿Deberíamos tener stand en el Maratón de Medellín? ¿Vale la inversión?" rows={4} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',resize:'none',outline:'none',boxSizing:'border-box',background:'#fff',color:'#1a1a18'}}/></div>
          <div><label style={lbl}>Contexto adicional</label><textarea value={ctx} onChange={e=>setCtx(e.target.value)} placeholder="Presupuesto disponible, situación actual, lo que ya sabe el equipo..." rows={3} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',resize:'none',outline:'none',boxSizing:'border-box',background:'#fff',color:'#1a1a18'}}/></div>
          <button onClick={gen} disabled={loading||!q} style={{padding:'11px',background:q?'#1a1a18':'#c0bfb5',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:q?'pointer':'default',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{loading?<Loader2 size={14} className="animate-spin"/>:'✦'} Generar propuesta</button>
        </div>
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700,color:'#1a1a18'}}>Propuesta generada</div>
            {out&&<button onClick={()=>navigator.clipboard.writeText(out)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',border:'1px solid #e0dfd5',borderRadius:7,fontSize:11,fontWeight:700,color:'#6b6a63',background:'#fff',cursor:'pointer',fontFamily:'inherit'}}><Copy size={11}/>Copiar</button>}
          </div>
          {loading&&!out&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#185fa5'}}><Loader2 size={13} className="animate-spin"/>Preparando propuesta...</div>}
          <div style={{fontSize:13,color:out?'#1a1a18':'#9c9a92',lineHeight:1.7,whiteSpace:'pre-wrap',minHeight:400,fontStyle:out?'normal':'italic'}}>{out||'La propuesta aparecerá aquí lista para presentar...'}</div>
        </div>
      </div>
    </div>
  )
}
