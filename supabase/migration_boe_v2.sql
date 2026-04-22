-- ============================================================
-- BOE v2: nuevas columnas en boe_publicaciones + tabla boe_temarios
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Nuevas columnas en boe_publicaciones
ALTER TABLE boe_publicaciones
  ADD COLUMN IF NOT EXISTS comunidad       TEXT DEFAULT 'estatal',
  ADD COLUMN IF NOT EXISTS organismo       TEXT,
  ADD COLUMN IF NOT EXISTS num_plazas      INTEGER,
  ADD COLUMN IF NOT EXISTS grupo           TEXT,
  ADD COLUMN IF NOT EXISTS vigente         BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sustituido_por  UUID REFERENCES boe_publicaciones(id),
  ADD COLUMN IF NOT EXISTS anio_convocatoria INTEGER,
  ADD COLUMN IF NOT EXISTS ia_procesado_at TIMESTAMPTZ;

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_boe_comunidad ON boe_publicaciones(comunidad);
CREATE INDEX IF NOT EXISTS idx_boe_vigente   ON boe_publicaciones(vigente) WHERE vigente = TRUE;

-- 2. Tabla de temarios oficiales
CREATE TABLE IF NOT EXISTS boe_temarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  oposicion_id    UUID REFERENCES oposiciones(id) ON DELETE SET NULL,
  publicacion_id  UUID REFERENCES boe_publicaciones(id) ON DELETE SET NULL,
  titulo          TEXT NOT NULL,
  comunidad       TEXT DEFAULT 'estatal',
  organismo       TEXT,
  url_pdf         TEXT,
  url_fuente      TEXT,
  fecha_vigencia  DATE,
  temas           JSONB,        -- [{ numero, titulo, descripcion }]
  vigente         BOOLEAN DEFAULT TRUE,
  ia_procesado_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_temarios_oposicion ON boe_temarios(oposicion_id);
CREATE INDEX IF NOT EXISTS idx_temarios_comunidad ON boe_temarios(comunidad);

ALTER TABLE boe_temarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "temarios_public_read" ON boe_temarios FOR SELECT USING (true);
