-- ============================================================
-- APROBEA — Schema completo v1
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Extensiones
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ============================================================
-- PERFILES DE USUARIO
-- ============================================================
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

-- ============================================================
-- ORGANISMOS Y CONVOCATORIAS
-- ============================================================
create table public.organismos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  tipo text check (tipo in ('ayuntamiento','diputacion','comunidad','estado','otro')),
  comunidad_autonoma text,
  boletin text,
  created_at timestamptz default now()
);

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

-- ============================================================
-- TEMAS Y CONTENIDO
-- ============================================================
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

create table public.tema_chunks (
  id uuid primary key default uuid_generate_v4(),
  tema_id uuid references public.temas(id) on delete cascade,
  contenido text not null,
  embedding vector(1536),
  orden int default 0
);
create index on public.tema_chunks using ivfflat (embedding vector_cosine_ops);

-- ============================================================
-- PREGUNTAS
-- ============================================================
create table public.preguntas (
  id uuid primary key default uuid_generate_v4(),
  tema_id uuid references public.temas(id) on delete cascade,
  tipo text not null check (tipo in ('test','desarrollo','vf','emparejamiento')),
  enunciado text not null,
  opciones jsonb,           -- [{letra:"A",texto:"..."}, ...]
  respuesta_correcta text not null,
  explicacion text,
  dificultad int default 3 check (dificultad between 1 and 5),
  veces_usada int default 0,
  veces_acertada int default 0,
  activa bool default true,
  created_at timestamptz default now()
);
create index on public.preguntas(tema_id);
create index on public.preguntas(tipo);
create index on public.preguntas(dificultad);

-- ============================================================
-- FLASHCARDS
-- ============================================================
create table public.flashcards (
  id uuid primary key default uuid_generate_v4(),
  tema_id uuid references public.temas(id) on delete cascade,
  pregunta text not null,
  respuesta text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- EXÁMENES
-- ============================================================
create table public.examenes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  convocatoria_id uuid references public.convocatorias(id),
  tipo text not null check (tipo in ('adaptativo','simulacro','libre','diagnostico')),
  modo text default 'practica' check (modo in ('practica','examen_real')),
  config jsonb default '{}',   -- {tiempo_limite, num_preguntas, penalizacion, temas_ids}
  estado text default 'en_curso' check (estado in ('en_curso','completado','expirado','abandonado')),
  puntuacion_final float,
  nota_sobre_10 float,
  tiempo_empleado int,          -- segundos
  feedback_ia text,
  created_at timestamptz default now(),
  completado_at timestamptz
);
create index on public.examenes(user_id);
create index on public.examenes(estado);

create table public.examen_preguntas (
  id uuid primary key default uuid_generate_v4(),
  examen_id uuid references public.examenes(id) on delete cascade,
  pregunta_id uuid references public.preguntas(id),
  orden int not null,
  respuesta_usuario text,
  correcta bool,
  puntos float default 0,
  tiempo_respuesta int          -- segundos
);
create index on public.examen_preguntas(examen_id);

-- ============================================================
-- REPETICIÓN ESPACIADA (Anki-style)
-- ============================================================
create table public.repeticion_espaciada (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  pregunta_id uuid references public.preguntas(id) on delete cascade,
  intervalo_dias int default 1,
  ease_factor float default 2.5,
  proxima_revision date default current_date,
  repeticiones int default 0,
  ultima_revision date,
  unique(user_id, pregunta_id)
);
create index on public.repeticion_espaciada(user_id, proxima_revision);

-- ============================================================
-- PROGRESO POR TEMA
-- ============================================================
create table public.progreso_usuario (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  tema_id uuid references public.temas(id) on delete cascade,
  porcentaje_completado float default 0,
  num_examenes int default 0,
  tasa_acierto float default 0,
  ultima_actividad timestamptz default now(),
  unique(user_id, tema_id)
);
create index on public.progreso_usuario(user_id);

-- ============================================================
-- BOE MONITOR
-- ============================================================
create table public.boe_publicaciones (
  id uuid primary key default uuid_generate_v4(),
  boletin text not null,
  fecha_publicacion date not null,
  titulo text,
  url text,
  texto_extraido text,
  procesado bool default false,
  es_convocatoria bool default false,
  convocatoria_id uuid references public.convocatorias(id),
  created_at timestamptz default now()
);
create index on public.boe_publicaciones(procesado);
create index on public.boe_publicaciones(fecha_publicacion);

-- ============================================================
-- ALERTAS DE USUARIOS
-- ============================================================
create table public.alertas_usuario (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  categorias text[] default '{}',
  comunidades text[] default '{}',
  tipos_organismo text[] default '{}',
  email_activo bool default true,
  created_at timestamptz default now()
);

-- ============================================================
-- TICKETS DE SOPORTE
-- ============================================================
create table public.tickets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  categoria text check (categoria in ('BILLING','REFUND','TECNICO','GENERAL','CONTENIDO')),
  mensaje_original text not null,
  resumen_ia text,
  estado text default 'pendiente' check (estado in ('pendiente','en_revision','resuelto','cerrado')),
  prioridad text default 'media' check (prioridad in ('alta','media','baja')),
  resolucion text,
  created_at timestamptz default now(),
  resuelto_at timestamptz
);
create index on public.tickets(estado);
create index on public.tickets(categoria);

-- ============================================================
-- EMAIL QUEUE
-- ============================================================
create table public.email_queue (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  tipo text check (tipo in (
    'alerta_convocatoria','churn_prevention','renovacion',
    'bienvenida','onboarding_d3','ticket_confirmacion','ticket_resuelto'
  )),
  payload jsonb default '{}',
  enviado bool default false,
  scheduled_for timestamptz default now(),
  enviado_at timestamptz,
  error text
);
create index on public.email_queue(enviado, scheduled_for);

-- ============================================================
-- WHITE-LABEL ACADEMIAS
-- ============================================================
create table public.academias (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  custom_domain text,
  logo_url text,
  color_primario text default '#1D9E75',
  owner_id uuid references public.profiles(id),
  plan text default 'academia',
  activa bool default true,
  created_at timestamptz default now()
);

create table public.academia_usuarios (
  academia_id uuid references public.academias(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  rol text default 'alumno' check (rol in ('admin','profesor','alumno')),
  primary key (academia_id, user_id)
);

-- ============================================================
-- SIMULACROS OFICIALES
-- ============================================================
create table public.simulacros (
  id uuid primary key default uuid_generate_v4(),
  convocatoria_id uuid references public.convocatorias(id),
  titulo text not null,
  num_preguntas int not null,
  tiempo_minutos int not null,
  penalizacion_incorrecta float default 0.25,
  temas_ids uuid[] default '{}',
  activo bool default true,
  created_at timestamptz default now()
);

-- ============================================================
-- FUNCIÓN: auto-crear perfil al registrarse
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  insert into public.email_queue (user_id, tipo, scheduled_for)
  values (new.id, 'bienvenida', now());

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FUNCIÓN: actualizar last_active_at
-- ============================================================
create or replace function public.update_last_active(p_user_id uuid)
returns void as $$
begin
  update public.profiles set last_active_at = now() where id = p_user_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FUNCIÓN: algoritmo SM-2 (repetición espaciada)
-- ============================================================
create or replace function public.actualizar_repeticion(
  p_user_id uuid,
  p_pregunta_id uuid,
  p_calidad int  -- 0=mal, 3=regular, 5=perfecto
) returns void as $$
declare
  v_rec record;
  v_ef float;
  v_intervalo int;
begin
  select * into v_rec from public.repeticion_espaciada
  where user_id = p_user_id and pregunta_id = p_pregunta_id;

  if not found then
    insert into public.repeticion_espaciada (user_id, pregunta_id)
    values (p_user_id, p_pregunta_id);
    select * into v_rec from public.repeticion_espaciada
    where user_id = p_user_id and pregunta_id = p_pregunta_id;
  end if;

  -- Actualizar ease factor
  v_ef := v_rec.ease_factor + (0.1 - (5 - p_calidad) * (0.08 + (5 - p_calidad) * 0.02));
  v_ef := greatest(1.3, v_ef);

  -- Calcular próximo intervalo
  if p_calidad < 3 then
    v_intervalo := 1;
  elsif v_rec.repeticiones = 0 then
    v_intervalo := 1;
  elsif v_rec.repeticiones = 1 then
    v_intervalo := 6;
  else
    v_intervalo := round(v_rec.intervalo_dias * v_ef);
  end if;

  update public.repeticion_espaciada set
    intervalo_dias = v_intervalo,
    ease_factor = v_ef,
    proxima_revision = current_date + v_intervalo,
    repeticiones = case when p_calidad >= 3 then repeticiones + 1 else 0 end,
    ultima_revision = current_date
  where user_id = p_user_id and pregunta_id = p_pregunta_id;
end;
$$ language plpgsql security definer;
