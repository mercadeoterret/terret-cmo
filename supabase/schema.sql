-- TERRET CMO — Ejecutar en Supabase SQL Editor

create table if not exists campanas (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  descripcion text,
  fecha_inicio date,
  fecha_fin date,
  presupuesto numeric,
  evento_relacionado text,
  objetivo text,
  meta_cuantificable text,
  canales text[],
  audiencia text[],
  notas text,
  output_claude text,
  estado text default 'activa',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists kpis (
  id uuid default gen_random_uuid() primary key,
  semana date not null unique,
  roas_meta numeric, roas_google numeric, roas_tiktok numeric,
  cpc_cop numeric, ctr_pct numeric, conversion_rate_pct numeric,
  inversion_meta_k numeric, revenue_meta_m numeric,
  inversion_google_k numeric, revenue_google_k numeric,
  inversion_tiktok_k numeric, revenue_tiktok_k numeric,
  revenue_email_k numeric, revenue_total_m numeric,
  notas text,
  created_at timestamptz default now()
);

create table if not exists calendario_eventos (
  id uuid default gen_random_uuid() primary key,
  fecha date not null,
  titulo text not null,
  descripcion text,
  tipo text not null default 'contenido',
  canal text,
  campana_id uuid references campanas(id) on delete cascade,
  completado boolean default false,
  color text default '#185fa5',
  responsable text default 'David',
  created_at timestamptz default now()
);

create table if not exists reportes_lunes (
  id uuid default gen_random_uuid() primary key,
  fecha date not null unique,
  tipo text default 'automatico',
  kpi_snapshot jsonb,
  reporte_markdown text,
  acciones jsonb,
  created_at timestamptz default now()
);

create table if not exists brand_knowledge (
  id uuid default gen_random_uuid() primary key,
  contenido text not null,
  activo boolean default true,
  created_at timestamptz default now()
);

-- Índices
create index if not exists calendario_fecha_idx on calendario_eventos(fecha);
create index if not exists calendario_campana_idx on calendario_eventos(campana_id);
create index if not exists kpis_semana_idx on kpis(semana desc);

-- RLS permisivo para MVP
alter table campanas enable row level security;
alter table kpis enable row level security;
alter table calendario_eventos enable row level security;
alter table reportes_lunes enable row level security;
alter table brand_knowledge enable row level security;

create policy "allow_all" on campanas for all using (true) with check (true);
create policy "allow_all" on kpis for all using (true) with check (true);
create policy "allow_all" on calendario_eventos for all using (true) with check (true);
create policy "allow_all" on reportes_lunes for all using (true) with check (true);
create policy "allow_all" on brand_knowledge for all using (true) with check (true);
