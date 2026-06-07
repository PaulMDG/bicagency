-- Ensure unique key on settings (for ON CONFLICT seed)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'settings_key_key'
  ) THEN
    ALTER TABLE public.settings ADD CONSTRAINT settings_key_key UNIQUE (key);
  END IF;
END $$;

-- Per-product SEO fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text;

-- Seed sitewide SEO settings
INSERT INTO public.settings (key, value, "group", is_public) VALUES
  ('seo_site_title', '', 'seo', true),
  ('seo_site_description', '', 'seo', true),
  ('seo_site_keywords', '', 'seo', true),
  ('seo_default_og_image', '', 'seo', true),
  ('seo_about_title', '', 'seo', true),
  ('seo_about_description', '', 'seo', true)
ON CONFLICT (key) DO NOTHING;
