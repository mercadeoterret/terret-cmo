export default function MetaPage(){
  return(
    <div style={{maxWidth:700,margin:'0 auto'}}>
      <div style={{marginBottom:20}}><h1 style={{fontSize:20,fontWeight:600,color:'#1a1a18',margin:0}}>Meta API</h1><p style={{fontSize:13,color:'#6b6a63',margin:'4px 0 0'}}>Conexión a Meta Ads e Instagram para análisis automático.</p></div>
      <div style={{background:'#fff',border:'1px solid #e0dfd5',borderRadius:12,padding:48,textAlign:'center'}}>
        <div style={{width:56,height:56,background:'#f0efe8',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:24}}>📡</div>
        <h2 style={{fontSize:16,fontWeight:600,color:'#1a1a18',marginBottom:8}}>Disponible para conectar</h2>
        <p style={{fontSize:13,color:'#6b6a63',maxWidth:440,margin:'0 auto 20px',lineHeight:1.7}}>La integración con Meta Ads e Instagram Graph API está lista. Para activarla necesitas una Meta App con portafolio comercial verificado.</p>
        <div style={{background:'#fffbf0',border:'1px solid #fde68a',borderRadius:10,padding:16,textAlign:'left',marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:600,color:'#b45309',marginBottom:8}}>Para activar cuando estés listo:</div>
          <ol style={{fontSize:12,color:'#92400e',paddingLeft:16,lineHeight:2,margin:0}}>
            <li>Crear Meta App en developers.facebook.com</li>
            <li>Configurar portafolio comercial y pasar revisión de Meta</li>
            <li>Obtener Access Token de larga duración</li>
            <li>Agregar META_ACCESS_TOKEN al .env en Vercel</li>
            <li>El módulo se activa automáticamente</li>
          </ol>
        </div>
        <div style={{fontSize:12,color:'#9c9a92'}}>Ad Account ID configurado: act_1182339200250734</div>
      </div>
    </div>
  )
}
