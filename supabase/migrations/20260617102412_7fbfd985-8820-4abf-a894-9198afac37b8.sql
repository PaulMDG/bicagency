
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url text;

CREATE TABLE IF NOT EXISTS public.product_categories (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, category_id)
);

GRANT SELECT ON public.product_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product categories"
  ON public.product_categories FOR SELECT USING (true);

CREATE POLICY "Admins manage product categories"
  ON public.product_categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_product_categories_category ON public.product_categories(category_id);

INSERT INTO public.product_categories (product_id, category_id)
  SELECT id, category_id FROM public.products WHERE category_id IS NOT NULL
  ON CONFLICT DO NOTHING;

INSERT INTO public.settings ("group", key, value) VALUES
  ('whatsapp', 'whatsapp_group_link', ''),
  ('about', 'about_hero_title', ''),
  ('about', 'about_hero_subtitle', ''),
  ('about', 'about_body_html', '<p>Tell your story here.</p>')
ON CONFLICT (key) DO NOTHING;
