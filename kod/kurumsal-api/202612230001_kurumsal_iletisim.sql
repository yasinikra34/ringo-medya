-- Kurumsal site iletişim / iş birliği formu (api/kurumsal/iletisim.js). Yalnız sahip okur (hatchable.toml read = member).
CREATE TABLE IF NOT EXISTS ringo_kurumsal_iletisim (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  konu text NOT NULL,
  ad text NOT NULL,
  eposta text NOT NULL,
  kurum text,
  mesaj text NOT NULL,
  sayfa text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ringo_kurumsal_iletisim_zaman ON ringo_kurumsal_iletisim (created_at DESC);
