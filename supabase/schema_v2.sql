-- ============================================================
-- APROBEA — Schema v2 (migration)
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- ============================================================
-- BLOG POSTS
-- ============================================================
create table if not exists public.blog_posts (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  slug text unique not null,
  contenido text,
  resumen text,
  imagen_url text,
  categoria text,
  tags text[] default '{}',
  publicado bool default false,
  autor_id uuid references auth.users(id),
  meta_title text,
  meta_desc text,
  vistas int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  publicado_at timestamptz
);
create index if not exists blog_posts_publicado_idx on public.blog_posts(publicado);
create index if not exists blog_posts_slug_idx on public.blog_posts(slug);
create index if not exists blog_posts_categoria_idx on public.blog_posts(categoria);

alter table public.blog_posts enable row level security;
create policy "blog public lee publicados" on public.blog_posts
  for select using (publicado = true);

-- ============================================================
-- RRSS POSTS
-- ============================================================
create table if not exists public.rrss_posts (
  id uuid primary key default uuid_generate_v4(),
  plataforma text not null check (plataforma in ('instagram','twitter','linkedin','facebook','tiktok')),
  contenido text not null,
  imagen_url text,
  hashtags text[] default '{}',
  scheduled_at timestamptz,
  publicado bool default false,
  publicado_at timestamptz,
  engagement jsonb default '{}',  -- {likes, shares, comments, reach}
  enlace_post text,
  convocatoria_id uuid references public.convocatorias(id),
  created_at timestamptz default now()
);
create index if not exists rrss_posts_plataforma_idx on public.rrss_posts(plataforma);
create index if not exists rrss_posts_scheduled_idx on public.rrss_posts(scheduled_at);

-- ============================================================
-- FUENTE/ORIGEN en TEMAS (dónde adquirir el material)
-- ============================================================
alter table public.temas add column if not exists fuente_url text;
alter table public.temas add column if not exists fuente_nombre text;
alter table public.temas add column if not exists precio_aprox text;
alter table public.temas add column if not exists pdf_url text;  -- ruta en Supabase Storage

-- ============================================================
-- ORGANISMO en CONVOCATORIAS (mejora)
-- ============================================================
alter table public.convocatorias add column if not exists organismo_nombre text;
alter table public.convocatorias add column if not exists enlace_bases text;  -- URL bases de la convocatoria

-- ============================================================
-- FUNCIÓN: auto-slug para blog_posts
-- ============================================================
create or replace function public.gen_slug(titulo text)
returns text as $$
begin
  return lower(
    regexp_replace(
      regexp_replace(
        translate(titulo, 'áéíóúàèìòùäëïöüâêîôûñç', 'aeiouaeiouaeiouaeiounooc'),
        '[^a-z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
end;
$$ language plpgsql immutable;
