-- Extensiones
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- PERFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text,
  plan text not null default 'free' check (plan in ('free','pro','academia')),
  stripe_customer_id text,
  stripe_subscription_id text,
  convocatoria_objetivo_id uuid,
  nivel_base int default 0,
  onboarding_completado bool default false,
  academia_id uuid,
  created_at timestamptz default now(),
  last_active_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "usuarios ven su propio perfil" on public.profiles
  for all using (auth.uid() = id);

-- ORGANISMOS
create table public.organismos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  tipo text check (tipo in ('ayuntamiento','diputacion','comunidad','estado','otro')),
  comunidad_autonoma text,
  boletin text,
  created_at timestamptz default now()
);

-- CONVOCATORIAS
create table public.convocatorias (
  id uuid primary key default uuid_generate_v4(),
  organismo_id uuid references public.organismos(id),
  titulo text not null,
  categoria text,
  num_plazas int,
  fecha_limite date,
  url_boletin text,
  fecha_publicacion date,
  estado text default 'activa' check (estado in ('activa','cerrada','en_curso','resuelta')),
  boletin_referencia text,
  texto_completo text,
  created_at timestamptz default now()
);
create index on public.convocatorias(estado);
create index on public.convocatorias(categoria);
create index on public.convocatorias(fecha_limite);

-- TEMAS
create table public.temas (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  contenido_texto text,
  convocatoria_id uuid references public.convocatorias(id),
  categoria text,
  orden int default 0,
  version int default 1,
  activo bool default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TEMA CHUNKS
create table public.tema_chunks (
  id uuid primary key default uuid_generate_v4(),
  tema_id uuid references public.temas(id) on delete cascade,
  contenido text not null,
  embedding vector(1536),
  orden int default 0
);
create index on public.tema_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
