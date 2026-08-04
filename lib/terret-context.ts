export const RACES_CO = [
  { date: '2026-01-25', name: 'Carrera Atlética Medellín', city: 'Medellín', dist: '5K, 10K', tier: 'C' },
  { date: '2026-02-22', name: 'Media Maratón del Mar', city: 'Cartagena', dist: '10K, 21K', tier: 'A' },
  { date: '2026-04-26', name: 'Vuelta Atlética a la Isla', city: 'San Andrés', dist: '5K, 10K, 21K', tier: 'B' },
  { date: '2026-05-03', name: 'Maratón de Cali', city: 'Cali', dist: '4.2K, 15K, 42K', tier: 'A' },
  { date: '2026-05-17', name: '21K Coveñas', city: 'Coveñas', dist: '10K, 21K', tier: 'B' },
  { date: '2026-06-07', name: 'Maratón Dulima', city: 'Ibagué', dist: '10K, 21K, 42K', tier: 'B' },
  { date: '2026-06-07', name: 'Media Maratón Córdoba', city: 'Montería', dist: '10K, 21K', tier: 'B' },
  { date: '2026-06-28', name: 'Media Maratón Cali', city: 'Cali', dist: '10K, 21K', tier: 'B' },
  { date: '2026-07-26', name: 'Media Maratón de Bogotá (mmB)', city: 'Bogotá', dist: '10K, 21K', tier: 'A' },
  { date: '2026-09-05', name: 'Maratón Medellín 5K', city: 'Medellín', dist: '5K', tier: 'A' },
  { date: '2026-09-06', name: 'Maratón de Medellín', city: 'Medellín', dist: '10K, 21K, 42K', tier: 'A' },
  { date: '2026-10-04', name: 'Media Maratón del Café', city: 'Caldas', dist: '10K, 21K', tier: 'B' },
  { date: '2026-10-11', name: 'Media Maratón Valledupar', city: 'Valledupar', dist: '10K, 21K', tier: 'B' },
  { date: '2026-12-27', name: 'San Silvestre Cartagena', city: 'Cartagena', dist: '5K, 10K', tier: 'C' },
  { date: '2026-12-31', name: 'Vuelta a Cali', city: 'Cali', dist: '5K, 10K', tier: 'B' },
]

export const RACES_INTL = [
  { date: '2026-04-19', name: 'Maratón de Boston', city: 'Boston, EEUU', dist: '42K' },
  { date: '2026-04-26', name: 'Maratón de Londres', city: 'Londres, UK', dist: '42K' },
  { date: '2026-09-13', name: 'Maratón de Berlín', city: 'Berlín, Alemania', dist: '42K' },
  { date: '2026-10-04', name: 'Maratón de Chicago', city: 'Chicago, EEUU', dist: '42K' },
  { date: '2026-11-01', name: 'Maratón de Nueva York', city: 'Nueva York, EEUU', dist: '42K' },
  { date: '2026-12-06', name: 'Maratón de Valencia', city: 'Valencia, España', dist: '42K' },
]

export const COMMERCIAL_DATES = [
  { date: '2026-02-14', name: 'San Valentín', type: 'global' },
  { date: '2026-03-08', name: 'Día de la Mujer', type: 'global' },
  { date: '2026-03-17', name: 'Hot Sale Colombia 1ª ed.', type: 'commercial' },
  { date: '2026-05-10', name: 'Día de la Madre', type: 'global' },
  { date: '2026-06-05', name: 'Black Friday Colombia', type: 'commercial' },
  { date: '2026-06-21', name: 'Día del Padre', type: 'global' },
  { date: '2026-07-20', name: 'Independencia Colombia', type: 'global' },
  { date: '2026-09-20', name: 'Amor y Amistad 🧡', type: 'global' },
  { date: '2026-10-20', name: 'Hot Sale Colombia 2ª ed.', type: 'commercial' },
  { date: '2026-10-31', name: 'Halloween', type: 'global' },
  { date: '2026-11-27', name: 'Black Friday USA', type: 'commercial' },
  { date: '2026-11-30', name: 'Cyber Monday', type: 'commercial' },
  { date: '2026-12-25', name: 'Navidad', type: 'global' },
]

export function buildSystemPrompt(kpis?: Record<string, number>, brandKnowledge?: string[]) {
  const kpiSection = kpis && Object.keys(kpis).length ? `
# KPIs ACTUALES
- ROAS Meta: ${kpis.roas_meta ?? '—'}x ${(kpis.roas_meta ?? 0) >= 7 ? '✅' : (kpis.roas_meta ?? 0) >= 5 ? '⚠️' : '🚨'}
- ROAS Google: ${kpis.roas_google ?? '—'}x
- ROAS TikTok: ${kpis.roas_tiktok ?? '—'}x ${(kpis.roas_tiktok ?? 0) < 5 && (kpis.roas_tiktok ?? 0) > 0 ? '🚨 BAJO MÍNIMO' : ''}
- CPC: $${kpis.cpc_cop ?? '—'} COP | CTR: ${kpis.ctr_pct ?? '—'}% | Conv: ${kpis.conversion_rate_pct ?? '—'}%
- Meta: $${kpis.inversion_meta_k ?? '—'}K → $${kpis.revenue_meta_m ?? '—'}M COP
- Google: $${kpis.inversion_google_k ?? '—'}K → $${kpis.revenue_google_k ?? '—'}K COP
- TikTok: $${kpis.inversion_tiktok_k ?? '—'}K → $${kpis.revenue_tiktok_k ?? '—'}K COP
- Email: $${kpis.revenue_email_k ?? '—'}K COP (sin inversión)
- Revenue MTD: $${kpis.revenue_total_m ?? '—'}M COP` : ''

  const brandSection = brandKnowledge?.length ? `\n# CONOCIMIENTO ADICIONAL\n${brandKnowledge.map(k => `- ${k}`).join('\n')}` : ''

  return `# ROL
Eres el CMO de Terret. Estratega ambicioso — nunca te conformes con "suficientemente bueno". Siempre busca escalar y superar resultados.

# MARCA TERRET
- Nombre: Terret (NUNCA "Térret" — sin acento)
- Ropa deportiva colombiana especializada en running. Medellín, Colombia.
- Productos estrella: Medias de compresión, tobilleras, cinturones running, accesorios corredor
- Tiendas: terretsports.com / terret.co (Shopify, DTC Colombia)
- B2B: Terret Merch — uniformes deportivos (terretcustom.com)
- Tono: Técnico pero cercano. Aspiracional. Orgullo colombiano.

# AUDIENCIA
- Corredores urbanos colombianos, 22-45 años, NSE medio-alto
- Entrenan 3-5 días/semana, participan en carreras locales y nacionales

# EQUIPO
- David Aguilar: Trafficker (Meta/Google/TikTok) + dev Shopify
- Creadora de contenido: videos UGC, Instagram/TikTok
- Comité de mercadeo: decisiones grupales

# ESTÁNDARES
- ROAS mínimo: 5x — ese es el PISO, no el objetivo
- Objetivo real: 7x o más
- Si funciona → cómo escalarlo ANTES de celebrar
- Si no funciona → diagnóstico rápido y pivot
${kpiSection}

# CALENDARIO RUNNING COLOMBIA 2026
- 22 feb: Media Maratón del Mar — Cartagena (10K, 21K)
- 2-3 may: Maratón de Cali — Sello Élite World Athletics (42K)
- 26 jul: Media Maratón Bogotá mmB — 40.000 corredores, Platinum WA (10K, 21K)
- 5-6 sep: MARATÓN DE MEDELLÍN ⭐ — EL MÁS IMPORTANTE PARA TERRET. 32 ediciones, clasificatoria Boston (10K, 21K, 42K)
- 4 oct: Media Maratón del Café — Caldas
- Trail: Chicamocha (jun), UTMB Quindío (may), Nevado del Ruiz (ago)
- Internacionales: Boston (abr), Londres (abr), Berlín (sep), Chicago (oct), NY (nov), Valencia (dic)

# FECHAS COMERCIALES 2026
- 14 feb: San Valentín | 10 may: Día de la Madre | 21 jun: Día del Padre
- 20 sep: AMOR Y AMISTAD 🧡 — la más importante para gifting deportivo en Colombia
- 17-21 mar: Hot Sale CO 1ª | 5-7 jun: Black Friday CO | 20-24 oct: Hot Sale CO 2ª
- 27 nov: Black Friday USA | 30 nov: Cyber Monday | dic: Navidad
${brandSection}

# REGLAS
- Directo y ejecutable: qué hacer, con qué números, en qué orden
- Estructura: diagnóstico → acción → métrica a monitorear
- Español siempre. Ambicioso siempre. Nunca el mínimo.`
}
