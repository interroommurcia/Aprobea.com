-- ============================================================
-- APROBEA.COM — Schema SQL para Plataforma de Oposiciones
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================================

-- HABILITAR EXTENSIONES
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. PERFILES DE USUARIO (extiende auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS perfiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ DEFAULT now(),
  nombre                TEXT,
  apellidos             TEXT,
  email                 TEXT,
  telefono              TEXT,
  plan                  TEXT DEFAULT 'free' CHECK (plan IN ('free','basico','pro','elite')),
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  plan_activo           BOOLEAN DEFAULT FALSE,
  plan_expira_en        TIMESTAMPTZ,
  avatar_url            TEXT,
  comunidad_autonoma    TEXT,
  horas_estudio_semana  INTEGER DEFAULT 10,
  notificaciones_email  BOOLEAN DEFAULT TRUE,
  notificaciones_boe    BOOLEAN DEFAULT TRUE
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfil_own" ON perfiles FOR ALL USING (auth.uid() = id);

-- ============================================================
-- 2. OPOSICIONES (catálogo)
-- ============================================================
CREATE TABLE IF NOT EXISTS oposiciones (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  codigo               TEXT UNIQUE,
  nombre               TEXT NOT NULL,
  nombre_corto         TEXT,
  cuerpo               TEXT,
  categoria            TEXT,
  subcategoria         TEXT,
  administracion       TEXT CHECK (administracion IN ('estatal','autonomica','local')) DEFAULT 'estatal',
  comunidad_autonoma   TEXT,
  plazas_ultima        INTEGER,
  plazas_estimadas     INTEGER,
  sueldo_base          NUMERIC(10,2),
  salario_bruto_anual  NUMERIC(12,2),
  ultima_convocatoria  DATE,
  proxima_convocatoria DATE,
  boe_url              TEXT,
  boe_id               TEXT,
  estado               TEXT DEFAULT 'activa' CHECK (estado IN ('activa','inactiva','en_convocatoria','sin_fecha')),
  dificultad           INTEGER DEFAULT 3 CHECK (dificultad BETWEEN 1 AND 5),
  descripcion          TEXT,
  requisitos           TEXT,
  imagen_url           TEXT,
  tags                 TEXT[],
  destacada            BOOLEAN DEFAULT FALSE,
  suscriptores_count   INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_oposiciones_estado ON oposiciones(estado);
CREATE INDEX IF NOT EXISTS idx_oposiciones_admin ON oposiciones(administracion);
CREATE INDEX IF NOT EXISTS idx_oposiciones_trgm ON oposiciones USING gin(nombre gin_trgm_ops);

-- ============================================================
-- 3. TEMARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS temarios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ DEFAULT now(),
  oposicion_id   UUID REFERENCES oposiciones(id) ON DELETE CASCADE NOT NULL,
  nombre         TEXT NOT NULL,
  descripcion    TEXT,
  version        TEXT DEFAULT '1.0',
  oficial        BOOLEAN DEFAULT FALSE,
  activo         BOOLEAN DEFAULT TRUE,
  temas_count    INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_temarios_oposicion ON temarios(oposicion_id);

-- ============================================================
-- 4. TEMAS (bloques del temario)
-- ============================================================
CREATE TABLE IF NOT EXISTS temas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ DEFAULT now(),
  temario_id     UUID REFERENCES temarios(id) ON DELETE CASCADE NOT NULL,
  oposicion_id   UUID REFERENCES oposiciones(id),
  numero         INTEGER,
  titulo         TEXT NOT NULL,
  descripcion    TEXT,
  importancia    INTEGER DEFAULT 5 CHECK (importancia BETWEEN 1 AND 10),
  frecuencia_examen INTEGER DEFAULT 3 CHECK (frecuencia_examen BETWEEN 1 AND 10),
  preguntas_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_temas_temario ON temas(temario_id);
CREATE INDEX IF NOT EXISTS idx_temas_oposicion ON temas(oposicion_id);

-- ============================================================
-- 5. DOCUMENTOS (PDFs subidos)
-- ============================================================
CREATE TABLE IF NOT EXISTS documentos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ DEFAULT now(),
  tema_id        UUID REFERENCES temas(id) ON DELETE SET NULL,
  oposicion_id   UUID REFERENCES oposiciones(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  storage_path   TEXT,
  url            TEXT,
  tipo           TEXT DEFAULT 'temario' CHECK (tipo IN ('temario','examen_oficial','normativa','resumen','otro')),
  procesado      BOOLEAN DEFAULT FALSE,
  procesando     BOOLEAN DEFAULT FALSE,
  chunks_count   INTEGER DEFAULT 0,
  paginas        INTEGER,
  tamano_bytes   BIGINT,
  subido_por     UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_documentos_oposicion ON documentos(oposicion_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tema ON documentos(tema_id);

-- ============================================================
-- 6. CHUNKS (fragmentos para RAG con embeddings)
-- ============================================================
CREATE TABLE IF NOT EXISTS chunks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ DEFAULT now(),
  documento_id   UUID REFERENCES documentos(id) ON DELETE CASCADE NOT NULL,
  tema_id        UUID REFERENCES temas(id) ON DELETE SET NULL,
  oposicion_id   UUID REFERENCES oposiciones(id),
  contenido      TEXT NOT NULL,
  embedding      vector(1536),
  orden          INTEGER,
  pagina         INTEGER,
  tokens         INTEGER
);

CREATE INDEX IF NOT EXISTS idx_chunks_documento ON chunks(documento_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tema ON chunks(tema_id);
-- Índice vectorial para búsqueda semántica (ajustar 'lists' según volumen)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Función para búsqueda semántica
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_oposicion_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid, contenido text, tema_id uuid, oposicion_id uuid,
  documento_id uuid, similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.contenido, c.tema_id, c.oposicion_id, c.documento_id,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  WHERE
    (filter_oposicion_id IS NULL OR c.oposicion_id = filter_oposicion_id)
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 7. BANCO DE PREGUNTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS preguntas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT now(),
  tema_id           UUID REFERENCES temas(id) ON DELETE CASCADE,
  oposicion_id      UUID REFERENCES oposiciones(id),
  enunciado         TEXT NOT NULL,
  tipo              TEXT DEFAULT 'test' CHECK (tipo IN ('test','verdadero_falso','desarrollo')),
  opciones          JSONB,
  -- opciones ejemplo: [{"letra":"A","texto":"..."},{"letra":"B","texto":"..."}]
  respuesta_correcta TEXT NOT NULL,
  explicacion       TEXT,
  dificultad        INTEGER DEFAULT 3 CHECK (dificultad BETWEEN 1 AND 5),
  fuente            TEXT DEFAULT 'ia' CHECK (fuente IN ('ia','oficial','admin','usuario')),
  anio_examen       INTEGER,
  veces_preguntada  INTEGER DEFAULT 0,
  veces_acertada    INTEGER DEFAULT 0,
  activa            BOOLEAN DEFAULT TRUE,
  -- IRT (Item Response Theory)
  irt_discriminacion NUMERIC(4,2) DEFAULT 1.0,
  irt_dificultad     NUMERIC(4,2) DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_preguntas_tema ON preguntas(tema_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_oposicion ON preguntas(oposicion_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_dificultad ON preguntas(dificultad);

-- ============================================================
-- 8. EXÁMENES (instancias por usuario)
-- ============================================================
CREATE TABLE IF NOT EXISTS examenes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  oposicion_id     UUID REFERENCES oposiciones(id),
  tipo             TEXT DEFAULT 'practica' CHECK (tipo IN ('practica','simulacro','repaso_fallos','adaptativo','oficial')),
  estado           TEXT DEFAULT 'en_curso' CHECK (estado IN ('en_curso','completado','abandonado')),
  preguntas_ids    UUID[],
  total_preguntas  INTEGER DEFAULT 0,
  respuestas       JSONB DEFAULT '{}',
  correctas        INTEGER DEFAULT 0,
  incorrectas      INTEGER DEFAULT 0,
  sin_responder    INTEGER DEFAULT 0,
  puntuacion       NUMERIC(5,2),
  tiempo_segundos  INTEGER,
  fecha_inicio     TIMESTAMPTZ DEFAULT now(),
  fecha_fin        TIMESTAMPTZ,
  penalizacion     BOOLEAN DEFAULT FALSE,
  coeficiente_pen  NUMERIC(3,2) DEFAULT 0.25
);

CREATE INDEX IF NOT EXISTS idx_examenes_user ON examenes(user_id);
CREATE INDEX IF NOT EXISTS idx_examenes_oposicion ON examenes(oposicion_id);
CREATE INDEX IF NOT EXISTS idx_examenes_estado ON examenes(estado);

ALTER TABLE examenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "examen_own" ON examenes FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 9. RESPUESTAS DETALLADAS
-- ============================================================
CREATE TABLE IF NOT EXISTS respuestas_usuario (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  examen_id        UUID REFERENCES examenes(id) ON DELETE CASCADE NOT NULL,
  user_id          UUID REFERENCES auth.users(id) NOT NULL,
  pregunta_id      UUID REFERENCES preguntas(id) NOT NULL,
  respuesta_dada   TEXT,
  correcta         BOOLEAN,
  tiempo_segundos  INTEGER,
  explicacion_ia   TEXT,
  confianza        INTEGER CHECK (confianza BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_respuestas_user_preg ON respuestas_usuario(user_id, pregunta_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_examen ON respuestas_usuario(examen_id);

ALTER TABLE respuestas_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "respuesta_own" ON respuestas_usuario FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 10. PROGRESO POR TEMA (aggregado)
-- ============================================================
CREATE TABLE IF NOT EXISTS progreso_temas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tema_id               UUID REFERENCES temas(id) ON DELETE CASCADE NOT NULL,
  oposicion_id          UUID REFERENCES oposiciones(id),
  porcentaje_acierto    NUMERIC(5,2) DEFAULT 0,
  preguntas_respondidas INTEGER DEFAULT 0,
  preguntas_acertadas   INTEGER DEFAULT 0,
  tiempo_total_segundos INTEGER DEFAULT 0,
  ultima_sesion         TIMESTAMPTZ,
  nivel_dominio         TEXT DEFAULT 'sin_iniciar' CHECK (nivel_dominio IN ('sin_iniciar','iniciado','en_progreso','dominado')),
  racha_correctas       INTEGER DEFAULT 0,
  -- Spaced repetition (SM-2)
  sm2_repeticiones      INTEGER DEFAULT 0,
  sm2_intervalo         INTEGER DEFAULT 1,
  sm2_easiness          NUMERIC(4,2) DEFAULT 2.5,
  sm2_proxima_revision  DATE,
  UNIQUE(user_id, tema_id)
);

CREATE INDEX IF NOT EXISTS idx_progreso_user ON progreso_temas(user_id);
CREATE INDEX IF NOT EXISTS idx_progreso_user_ops ON progreso_temas(user_id, oposicion_id);

ALTER TABLE progreso_temas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progreso_own" ON progreso_temas FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 11. SUSCRIPCIONES A OPOSICIONES (por usuario)
-- ============================================================
CREATE TABLE IF NOT EXISTS suscripciones_oposicion (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ DEFAULT now(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  oposicion_id   UUID REFERENCES oposiciones(id) ON DELETE CASCADE NOT NULL,
  activa         BOOLEAN DEFAULT TRUE,
  fecha_examen   DATE,
  UNIQUE(user_id, oposicion_id)
);

ALTER TABLE suscripciones_oposicion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suscripcion_own" ON suscripciones_oposicion FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 12. BOE PUBLICACIONES (monitoreo automático)
-- ============================================================
CREATE TABLE IF NOT EXISTS boe_publicaciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT now(),
  boe_id            TEXT UNIQUE,
  titulo            TEXT,
  texto             TEXT,
  tipo              TEXT CHECK (tipo IN ('convocatoria','bases','temario','resultado','rectificacion','otro')),
  oposicion_id      UUID REFERENCES oposiciones(id),
  boe_fuente        TEXT DEFAULT 'estatal' CHECK (boe_fuente IN ('estatal','madrid','cataluna','andalucia','valencia','galicia','euskadi','aragon','castilla_leon','otro')),
  url               TEXT,
  url_pdf           TEXT,
  fecha_publicacion DATE,
  departamento      TEXT,
  resumen_ia        TEXT,
  procesado         BOOLEAN DEFAULT FALSE,
  relevancia        INTEGER DEFAULT 5 CHECK (relevancia BETWEEN 1 AND 10)
);

CREATE INDEX IF NOT EXISTS idx_boe_fecha ON boe_publicaciones(fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_boe_tipo ON boe_publicaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_boe_trgm ON boe_publicaciones USING gin(titulo gin_trgm_ops);

-- ============================================================
-- 13. ALERTAS BOE (configuración por usuario)
-- ============================================================
CREATE TABLE IF NOT EXISTS alertas_boe (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  oposicion_id    UUID REFERENCES oposiciones(id) ON DELETE CASCADE,
  palabras_clave  TEXT[],
  activa          BOOLEAN DEFAULT TRUE,
  email           BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, oposicion_id)
);

ALTER TABLE alertas_boe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerta_own" ON alertas_boe FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 14. PLANES DE ESTUDIO (generados por IA)
-- ============================================================
CREATE TABLE IF NOT EXISTS planes_estudio (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),
  user_id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  oposicion_id             UUID REFERENCES oposiciones(id),
  fecha_examen             DATE,
  horas_disponibles_semana INTEGER DEFAULT 10,
  dias_disponibles         TEXT[] DEFAULT ARRAY['lunes','martes','miercoles','jueves','viernes'],
  plan                     JSONB,
  activo                   BOOLEAN DEFAULT TRUE,
  porcentaje_completado    NUMERIC(5,2) DEFAULT 0
);

ALTER TABLE planes_estudio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_own" ON planes_estudio FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 15. FLASHCARDS (spaced repetition cards)
-- ============================================================
CREATE TABLE IF NOT EXISTS flashcards (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ DEFAULT now(),
  tema_id        UUID REFERENCES temas(id) ON DELETE CASCADE,
  oposicion_id   UUID REFERENCES oposiciones(id),
  pregunta       TEXT NOT NULL,
  respuesta      TEXT NOT NULL,
  fuente         TEXT DEFAULT 'ia' CHECK (fuente IN ('ia','admin','usuario'))
);

CREATE INDEX IF NOT EXISTS idx_flashcards_tema ON flashcards(tema_id);

CREATE TABLE IF NOT EXISTS flashcards_usuario (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flashcard_id    UUID REFERENCES flashcards(id) ON DELETE CASCADE NOT NULL,
  sm2_repeticiones INTEGER DEFAULT 0,
  sm2_intervalo    INTEGER DEFAULT 1,
  sm2_easiness     NUMERIC(4,2) DEFAULT 2.5,
  proxima_revision DATE DEFAULT CURRENT_DATE,
  veces_fallada    INTEGER DEFAULT 0,
  UNIQUE(user_id, flashcard_id)
);

ALTER TABLE flashcards_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flashcard_user_own" ON flashcards_usuario FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 16. USO DE IA (control de costes)
-- ============================================================
CREATE TABLE IF NOT EXISTS ia_uso (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  user_id         UUID REFERENCES auth.users(id),
  tipo            TEXT CHECK (tipo IN ('correccion','rag','plan','resumen','chat','batch')),
  modelo          TEXT,
  tokens_entrada  INTEGER DEFAULT 0,
  tokens_salida   INTEGER DEFAULT 0,
  tokens_cache_hit INTEGER DEFAULT 0,
  coste_eur       NUMERIC(12,8) DEFAULT 0,
  fecha           DATE DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_ia_uso_user_fecha ON ia_uso(user_id, fecha);
CREATE INDEX IF NOT EXISTS idx_ia_uso_fecha ON ia_uso(fecha DESC);

-- ============================================================
-- 17. NOTIFICACIONES (in-app)
-- ============================================================
CREATE TABLE IF NOT EXISTS notificaciones_usuario (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo        TEXT CHECK (tipo IN ('boe','logro','examen','plan','sistema')),
  titulo      TEXT NOT NULL,
  mensaje     TEXT,
  url         TEXT,
  leida       BOOLEAN DEFAULT FALSE,
  datos       JSONB
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notificaciones_usuario(user_id, leida);

ALTER TABLE notificaciones_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON notificaciones_usuario FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 18. LOGROS Y GAMIFICACIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS logros (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  icono       TEXT,
  xp          INTEGER DEFAULT 100,
  condicion   JSONB
);

CREATE TABLE IF NOT EXISTS logros_usuario (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT now(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  logro_id     UUID REFERENCES logros(id),
  UNIQUE(user_id, logro_id)
);

ALTER TABLE logros_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logro_user_own" ON logros_usuario FOR ALL USING (auth.uid() = user_id);

-- XP y racha global por usuario
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS xp_total INTEGER DEFAULT 0;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS racha_dias INTEGER DEFAULT 0;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS ultima_actividad DATE;

-- ============================================================
-- 19. RANKING ANÓNIMO
-- ============================================================
CREATE TABLE IF NOT EXISTS ranking_semanal (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana       DATE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  oposicion_id UUID REFERENCES oposiciones(id),
  preguntas_ok INTEGER DEFAULT 0,
  tiempo_min   INTEGER DEFAULT 0,
  xp_semana    INTEGER DEFAULT 0,
  posicion     INTEGER,
  UNIQUE(semana, user_id, oposicion_id)
);

-- ============================================================
-- LOGROS INICIALES
-- ============================================================
INSERT INTO logros (codigo, nombre, descripcion, icono, xp) VALUES
  ('primer_examen', 'Primer Paso', 'Completa tu primer examen', '🎯', 50),
  ('racha_7', 'Racha de 7', '7 días de estudio consecutivos', '🔥', 200),
  ('racha_30', 'Mes de hierro', '30 días de estudio consecutivos', '💎', 1000),
  ('100_preguntas', 'Centenario', 'Responde 100 preguntas', '💯', 150),
  ('tema_dominado', 'Maestro de tema', 'Domina un tema al 90%', '🏆', 300),
  ('simulacro', 'Simulacro real', 'Completa un simulacro oficial', '📝', 500),
  ('boe_activado', 'Radar BOE', 'Activa las alertas de BOE', '📡', 30),
  ('plan_creado', 'Planificador', 'Genera tu plan de estudio con IA', '📅', 100)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- FUNCIÓN: actualizar progreso de tema tras examen
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_progreso_tema(
  p_user_id UUID,
  p_tema_id UUID,
  p_oposicion_id UUID,
  p_correctas INTEGER,
  p_total INTEGER,
  p_tiempo INTEGER
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_pct NUMERIC;
  v_nivel TEXT;
BEGIN
  IF p_total = 0 THEN RETURN; END IF;
  v_pct := (p_correctas::NUMERIC / p_total) * 100;
  v_nivel := CASE
    WHEN v_pct >= 85 THEN 'dominado'
    WHEN v_pct >= 60 THEN 'en_progreso'
    WHEN v_pct > 0  THEN 'iniciado'
    ELSE 'sin_iniciar'
  END;

  INSERT INTO progreso_temas (user_id, tema_id, oposicion_id, porcentaje_acierto, preguntas_respondidas, preguntas_acertadas, tiempo_total_segundos, ultima_sesion, nivel_dominio)
  VALUES (p_user_id, p_tema_id, p_oposicion_id, v_pct, p_total, p_correctas, p_tiempo, now(), v_nivel)
  ON CONFLICT (user_id, tema_id) DO UPDATE SET
    preguntas_respondidas = progreso_temas.preguntas_respondidas + EXCLUDED.preguntas_respondidas,
    preguntas_acertadas   = progreso_temas.preguntas_acertadas + EXCLUDED.preguntas_acertadas,
    tiempo_total_segundos = progreso_temas.tiempo_total_segundos + EXCLUDED.tiempo_total_segundos,
    porcentaje_acierto    = (progreso_temas.preguntas_acertadas + EXCLUDED.preguntas_acertadas)::NUMERIC
                            / NULLIF(progreso_temas.preguntas_respondidas + EXCLUDED.preguntas_respondidas, 0) * 100,
    nivel_dominio         = v_nivel,
    ultima_sesion         = now(),
    updated_at            = now();
END;
$$;
