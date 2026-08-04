'use client'
import { useState } from 'react'
import { Loader2, Copy } from 'lucide-react'
const TIPOS=['Brief para creadora de contenido','Brief de campaña para el comité','Brief para diseñador gráfico','Brief de pauta para trafficker','Resumen ejecutivo de campaña','Brief para stand en carrera','Brief para alianza o colaboración']
export default function BriefsPage(){
  const [form,setForm]=useState({tipo:TIPOS[0],proyecto:'',deadline:'',detalles:''})
  const [out,setOut]=useState('');const [loading,setLoading]=useState(false)
  async function gen(){
    setLoading(true);setOut('')
    const p=`Genera un ${form.tipo} profesional y completo para Terret. Proyecto: "${form.proyecto||'campaña Terret'}". Entrega: ${form.deadline||'por definir'}.${form.detalles?` Detalles: ${form.detalles}`:''} Tan completo que quien lo reciba ejecute sin reunión adicional. Si es para creadora: referencias visuales, formatos, restricciones, ejemplos. Si es para comité: lenguaje accesible, opciones con pros/contras, recomendación clara del CMO.`
    const r=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'brief',messages:[{role:'user',content:p}]})})
    const reader=r.body!.getReader();const dec=new TextDecoder();let text=''
    while(true){const{done,value}=await reader.read();if(done)break;text+=dec.decode(value);setOut(text)}
    setLoading(false)
  }
  return(
    <div style={{maxWidth:1000,margin:'0 auto'}}>
      <div style={{marginBottom:20}}><h1 style={{fontSize:20,fontWeight:600,color:'#1a1a18',margin:0}}>Briefings</h1><p style={{fontSize:13,color:'#6b6a63',margin:'4px 0 0'}}>Genera briefs completos para tu equipo y proveedores.</p></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20,display:'flex',flexDirection:'column',gap:14}}>
          {[['Tipo de brief',<select key="t" value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select>],
            ['Proyecto / campaña',<input key="p" value={form.proyecto} onChange={e=>setForm(f=>({...f,proyecto:e.target.value}))} placeholder="Nombre exacto" style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box' as const}}/>],
            ['Fecha de entrega',<input key="d" type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}/>],
            ['Detalles a incluir',<textarea key="dt" value={form.detalles} onChange={e=>setForm(f=>({...f,detalles:e.target.value}))} placeholder="Objetivos, restricciones, entregables esperados..." rows={4} style={{width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',resize:'none' as const,outline:'none',boxSizing:'border-box' as const}}/>]
          ].map(([l,el])=><div key={l as string}><label style={{display:'block',fontSize:10,fontWeight:600,color:'#6b6a63',textTransform:'uppercase' as const,letterSpacing:'.5px',marginBottom:5}}>{l}</label>{el}</div>)}
          <button onClick={gen} disabled={loading} style={{padding:'10px',background:'#1a1a18',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {loading?<Loader2 size={14} className="animate-spin"/>:'✦'} Generar brief
          </button>
        </div>
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:'#1a1a18'}}>Brief generado</div>
            {out&&<button onClick={()=>navigator.clipboard.writeText(out)} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',border:'1px solid #e0dfd5',borderRadius:7,fontSize:11,color:'#6b6a63',background:'transparent',cursor:'pointer',fontFamily:'inherit'}}><Copy size={11}/>Copiar</button>}
          </div>
          {loading&&!out&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#185fa5'}}><Loader2 size={13} className="animate-spin"/>Redactando...</div>}
          <div style={{fontSize:12,color:out?'#1a1a18':'#9c9a92',lineHeight:1.7,whiteSpace:'pre-wrap',minHeight:360,fontStyle:out?'normal':'italic'}}>{out||'El brief aparecerá aquí...'}</div>
        </div>
      </div>
    </div>
  )
}
