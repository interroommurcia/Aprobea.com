-- ============================================================
-- APROBEA.COM — Funciones auxiliares
-- ============================================================

-- Incrementar XP de un usuario
CREATE OR REPLACE FUNCTION increment_xp(p_user_id UUID, p_xp INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_ultima DATE; v_hoy DATE := CURRENT_DATE; v_racha INTEGER;
BEGIN
  SELECT ultima_actividad INTO v_ultima FROM perfiles WHERE id = p_user_id;
  v_racha := CASE
    WHEN v_ultima = v_hoy - 1 THEN COALESCE((SELECT racha_dias FROM perfiles WHERE id = p_user_id), 0) + 1
    WHEN v_ultima = v_hoy     THEN COALESCE((SELECT racha_dias FROM perfiles WHERE id = p_user_id), 0)
    ELSE 1
  END;
  UPDATE perfiles SET
    xp_total         = COALESCE(xp_total, 0) + p_xp,
    racha_dias       = v_racha,
    ultima_actividad = v_hoy
  WHERE id = p_user_id;
END;
$$;

-- Obtener ranking semanal por oposición
CREATE OR REPLACE FUNCTION get_ranking_semanal(p_oposicion_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (posicion BIGINT, user_id UUID, nombre TEXT, xp_semana INTEGER, preguntas_ok INTEGER)
LANGUAGE plpgsql AS $$
DECLARE v_semana DATE := date_trunc('week', CURRENT_DATE)::DATE;
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY rs.xp_semana DESC) AS posicion,
    rs.user_id,
    COALESCE(p.nombre, 'Opositor') AS nombre,
    rs.xp_semana,
    rs.preguntas_ok
  FROM ranking_semanal rs
  JOIN perfiles p ON p.id = rs.user_id
  WHERE rs.semana = v_semana AND rs.oposicion_id = p_oposicion_id
  ORDER BY rs.xp_semana DESC
  LIMIT p_limit;
END;
$$;

-- Actualizar ranking semanal (llamar tras cada examen)
CREATE OR REPLACE FUNCTION upsert_ranking_semanal(p_user_id UUID, p_oposicion_id UUID, p_preguntas_ok INTEGER, p_xp INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_semana DATE := date_trunc('week', CURRENT_DATE)::DATE;
BEGIN
  INSERT INTO ranking_semanal (semana, user_id, oposicion_id, preguntas_ok, xp_semana)
  VALUES (v_semana, p_user_id, p_oposicion_id, p_preguntas_ok, p_xp)
  ON CONFLICT (semana, user_id, oposicion_id) DO UPDATE SET
    preguntas_ok = ranking_semanal.preguntas_ok + EXCLUDED.preguntas_ok,
    xp_semana    = ranking_semanal.xp_semana + EXCLUDED.xp_semana;
END;
$$;
