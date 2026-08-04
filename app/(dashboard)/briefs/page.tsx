'use client'
import { useState } from 'react'
import { Loader2, Copy } from 'lucide-react'
const TIPOS=['Brief para creadora de contenido','Brief de campaña para el comité','Brief para diseñador gráfico','Brief de pauta','Resumen ejecutivo','Brief para stand en carrera','Brief para alianza/colaboración']
export default function BriefsPage(){
  const [form,setForm]=useState({tipo:TIPOS[0],proyecto:'',deadline:'',detalles:''})
  const [out,setOut]=useState('');const [loading,setLoading]=useState(false)
  const lbl:React.CSSProperties={display:'block',fontSize:10,fontWeight:700,color:'#6b6a63',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}
  const inp:React.CSSProperties={width:'100%',padding:'9px 12px',border:'1px solid #c0bfb5',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff',color:'#1a1a18'}
  async function gen(){
    setLoading(true);setOut('')
    const p=`Genera un ${form.tipo} COMPLETO para Terret.\nProyecto: "${form.proyecto||'campaña Terret'}"\nEntrega: ${form.deadline||'por definir'}\n${form.detalles?`Detalles: ${form.detalles}`:''}\n\nEl brief debe ser tan completo que quien lo reciba ejecute sin necesitar ninguna reunión adicional. Con todas las secciones relevantes, entregables específicos con fechas, y requisitos técnicos cuando aplique.`
    const r=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'brief',messages:[{role:'user',content:p}]})})
    const reader=r.body!.getReader();const dec=new TextDecoder();let text=''
    while(true){const{done,value}=await reader.read();if(done)break;text+=dec.decode(value);setOut(text)}
    setLoading(false)
  }
  return(
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      <div style={{marginBottom:20}}><h1 style={{fontSize:22,fontWeight:800,color:'#1a1a18',margin:0}}>Briefings</h1><p style={{fontSize:13,color:'#6b6a63',margin:'4px 0 0'}}>Briefs completos para tu equipo. Listos para enviar.</p></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20,display:'flex',flexDirection:'column',gap:14}}>
          {([['Tipo',<select key="t" value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inp}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select>],
            ['Proyecto',<input key="p" value={form.proyecto} onChange={e=>setForm(f=>({...f,proyecto:e.target.value}))} placeholder="Nombre del proyecto o campaña" style={inp}/>],
            ['Fecha de entrega',<input key="d" type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} style={inp}/>],
            ['Detalles',<textarea key="dt" value={form.detalles} onChange={e=>setForm(f=>({...f,detalles:e.target.value}))} placeholder="Qué incluir, restricciones, formatos esperados..." rows={4} style={{...inp,resize:'none' as const}}/>]
          ] as [string, React.ReactNode][]).map(([l,el])=><div key={l}><label style={lbl}>{l}</label>{el}</div>)}
          <button onClick={gen} disabled={loading} style={{padding:'11px',background:'#1a1a18',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {loading?<Loader2 size={14} className="animate-spin"/>:'✦'} Generar brief
          </button>
        </div>
        <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700,color:'#1a1a18'}}>Brief generado</div>
            {out&&<button onClick={()=>navigator.clipboard.writeText(out)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',border:'1px solid #e0dfd5',borderRadius:7,fontSize:11,fontWeight:700,color:'#6b6a63',background:'#fff',cursor:'pointer',fontFamily:'inherit'}}><Copy size={11}/>Copiar</button>}
          </div>
          {loading&&!out&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#185fa5'}}><Loader2 size={13} className="animate-spin"/>Redactando...</div>}
          <div style={{fontSize:13,color:out?'#1a1a18':'#9c9a92',lineHeight:1.7,whiteSpace:'pre-wrap',minHeight:400,fontStyle:out?'normal':'italic'}}>{out||'El brief aparecerá aquí listo para enviar...'}</div>
        </div>
      </div>
    </div>
  )
}
