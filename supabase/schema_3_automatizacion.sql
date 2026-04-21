-- BOE MONITOR
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

-- ALERTAS USUARIO
create table public.alertas_usuario (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  categorias text[] default '{}',
  comunidades text[] default '{}',
  tipos_organismo text[] default '{}',
  email_activo bool default true,
  created_at timestamptz default now()
);

-- TICKETS
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

-- EMAIL QUEUE
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

-- ACADEMIAS
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

-- FUNCIÓN: auto-crear perfil al registrarse
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

-- FUNCIÓN: actualizar last_active_at
create or replace function public.update_last_active(p_user_id uuid)
returns void as $$
begin
  update public.profiles set last_active_at = now() where id = p_user_id;
end;
$$ language plpgsql security definer;

-- FUNCIÓN: algoritmo SM-2
create or replace function public.actualizar_repeticion(
  p_user_id uuid,
  p_pregunta_id uuid,
  p_calidad int
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

  v_ef := v_rec.ease_factor + (0.1 - (5 - p_calidad) * (0.08 + (5 - p_calidad) * 0.02));
  v_ef := greatest(1.3, v_ef);

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
