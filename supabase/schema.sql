-- ============================================================
-- GRUPOSKYLINE CRM — Schema SQL
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================================

-- 1. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre          TEXT NOT NULL,
  apellidos       TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  telefono        TEXT,
  tipo_inversor   TEXT CHECK (tipo_inversor IN ('npl','crowdfunding','hipotecario')) DEFAULT 'crowdfunding',
  capital_inicial NUMERIC(14,2) DEFAULT 0,
  estado          TEXT CHECK (estado IN ('lead','activo','inactivo','rechazado')) DEFAULT 'lead',
  notas           TEXT
);

-- 1b. Columnas de membresía crowdfunding (ejecutar si la tabla ya existe)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS membresia_crowdfunding_activa BOOLEAN DEFAULT FALSE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS membresia_gratis              BOOLEAN DEFAULT FALSE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS membresia_expira_en           TIMESTAMPTZ;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS stripe_customer_id            TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS stripe_subscription_id        TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS suscripcion_activa            BOOLEAN DEFAULT FALSE;

-- 1c. Tabla de eventos del calendario
CREATE TABLE IF NOT EXISTS eventos_calendario (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  cliente_id  UUID REFERENCES clientes(id) ON DELETE CASCADE,
  user_id     UUID,
  titulo      TEXT NOT NULL,
  descripcion TEXT,
  fecha       DATE NOT NULL,
  hora        TEXT,
  tipo        TEXT CHECK (tipo IN ('manual','operacion','vencimiento','pago','recordatorio')) DEFAULT 'manual',
  color       TEXT
);
CREATE INDEX IF NOT EXISTS idx_eventos_cliente ON eventos_calendario(cliente_id);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos_calendario(fecha);

-- 2. PARTICIPACIONES (cuenta de participaciones)
CREATE TABLE IF NOT EXISTS participaciones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT now(),
  cliente_id            UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  tipo                  TEXT CHECK (tipo IN ('npl','crowdfunding','hipotecario')) NOT NULL,
  nombre_operacion      TEXT NOT NULL,
  importe               NUMERIC(14,2) NOT NULL,
  fecha_entrada         DATE NOT NULL,
  fecha_vencimiento     DATE,
  rentabilidad_anual    NUMERIC(6,2) DEFAULT 0,
  rentabilidad_acum     NUMERIC(14,2) DEFAULT 0,
  estado                TEXT CHECK (estado IN ('activa','finalizada','pendiente','cancelada')) DEFAULT 'activa'
);

-- 3. MOVIMIENTOS (entradas, intereses, salidas…)
CREATE TABLE IF NOT EXISTS movimientos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  participacion_id UUID REFERENCES participaciones(id) ON DELETE CASCADE NOT NULL,
  cliente_id       UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  tipo             TEXT CHECK (tipo IN ('entrada','salida','interes','dividendo','comision')) NOT NULL,
  importe          NUMERIC(14,2) NOT NULL,
  fecha            DATE NOT NULL,
  descripcion      TEXT,
  confirmado       BOOLEAN DEFAULT false
);

-- 4. CONTABILIDAD (ingresos y gastos de la empresa)
CREATE TABLE IF NOT EXISTS contabilidad (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  concepto   TEXT NOT NULL,
  tipo       TEXT CHECK (tipo IN ('ingreso','gasto')) NOT NULL,
  importe    NUMERIC(14,2) NOT NULL,
  fecha      DATE NOT NULL,
  categoria  TEXT,
  notas      TEXT
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clientes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE participaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contabilidad   ENABLE ROW LEVEL SECURITY;

-- Clientes: cada usuario ve solo su propio registro
CREATE POLICY "cliente_own" ON clientes
  FOR ALL USING (auth.uid() = user_id);

-- Participaciones: usuario ve las suyas vía su cliente
CREATE POLICY "participacion_own" ON participaciones
  FOR ALL USING (
    cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid())
  );

-- Movimientos: usuario ve los suyos
CREATE POLICY "movimiento_own" ON movimientos
  FOR ALL USING (
    cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid())
  );

-- Contabilidad: solo acceso vía service_role (admin), sin policy de usuario
-- (RLS activo = ningún usuario autenticado puede leerla)

-- 5. IA_DOCUMENTOS (base de conocimiento para el asistente)
-- Ejecutar también:
CREATE TABLE IF NOT EXISTS ia_uso_clientes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  cliente_id    UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  fecha         DATE NOT NULL,
  tokens_entrada INTEGER DEFAULT 0,
  tokens_salida  INTEGER DEFAULT 0,
  coste_eur     NUMERIC(12,8) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ia_uso_cliente_fecha ON ia_uso_clientes(cliente_id, fecha);

-- 7. CITAS_SOLICITUDES (solicitudes de llamada/cita presencial desde la IA)
CREATE TABLE IF NOT EXISTS citas_solicitudes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  cliente_id       UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  tipo             TEXT CHECK (tipo IN ('llamada','presencial')) DEFAULT 'llamada',
  fecha_propuesta  DATE,
  hora_propuesta   TEXT,
  mensaje          TEXT NOT NULL,
  estado           TEXT CHECK (estado IN ('pendiente','confirmada','denegada','reprogramada')) DEFAULT 'pendiente',
  fecha_confirmada DATE,
  hora_confirmada  TEXT,
  nota_admin       TEXT,
  conversacion_ia  JSONB   -- historial del chat IA previo a la solicitud
);
CREATE INDEX IF NOT EXISTS idx_citas_cliente ON citas_solicitudes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_citas_estado  ON citas_solicitudes(estado);

-- 8. IA_DOCUMENTOS
CREATE TABLE IF NOT EXISTS ia_documentos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  nombre     TEXT NOT NULL,
  contenido  TEXT NOT NULL
);
-- Sin RLS — solo acceso vía service_role (admin)

-- ============================================================
-- ESTADOS Y FASES — operaciones_estudiadas
-- ============================================================
-- Ejecutar en Supabase → SQL Editor si la tabla ya existe
ALTER TABLE operaciones_estudiadas
  ADD COLUMN IF NOT EXISTS estado_operacion TEXT DEFAULT 'activa'
    CHECK (estado_operacion IN ('activa','reservada','completada','finalizada'));

ALTER TABLE operaciones_estudiadas
  ADD COLUMN IF NOT EXISTS fase_hipotecaria TEXT;
