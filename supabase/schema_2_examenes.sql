-- PREGUNTAS
create table public.preguntas (
  id uuid primary key default uuid_generate_v4(),
  tema_id uuid references public.temas(id) on delete cascade,
  tipo text not null check (tipo in ('test','desarrollo','vf','emparejamiento')),
  enunciado text not null,
  opciones jsonb,
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

-- FLASHCARDS
create table public.flashcards (
  id uuid primary key default uuid_generate_v4(),
  tema_id uuid references public.temas(id) on delete cascade,
  pregunta text not null,
  respuesta text not null,
  created_at timestamptz default now()
);

-- EXAMENES
create table public.examenes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  convocatoria_id uuid references public.convocatorias(id),
  tipo text not null check (tipo in ('adaptativo','simulacro','libre','diagnostico')),
  modo text default 'practica' check (modo in ('practica','examen_real')),
  config jsonb default '{}',
  estado text default 'en_curso' check (estado in ('en_curso','completado','expirado','abandonado')),
  puntuacion_final float,
  nota_sobre_10 float,
  tiempo_empleado int,
  feedback_ia text,
  created_at timestamptz default now(),
  completado_at timestamptz
);
create index on public.examenes(user_id);
create index on public.examenes(estado);

-- EXAMEN PREGUNTAS
create table public.examen_preguntas (
  id uuid primary key default uuid_generate_v4(),
  examen_id uuid references public.examenes(id) on delete cascade,
  pregunta_id uuid references public.preguntas(id),
  orden int not null,
  respuesta_usuario text,
  correcta bool,
  puntos float default 0,
  tiempo_respuesta int
);
create index on public.examen_preguntas(examen_id);

-- REPETICION ESPACIADA
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

-- PROGRESO USUARIO
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

-- SIMULACROS
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
