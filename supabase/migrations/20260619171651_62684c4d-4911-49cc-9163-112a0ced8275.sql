-- Restore Data API grants. RLS policies remain authoritative for row-level access.

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- Public read for store-facing tables (RLS still filters which rows)
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.subcategories TO anon;
GRANT SELECT ON public.product_categories TO anon;
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT ON public.settings TO anon;

-- Products: anon can read all columns EXCEPT supplier_id
GRANT SELECT (
  id, category_id, subcategory_id, name, slug, sku, description,
  retail_price, wholesale_price, preorder_price, retail_stock,
  wholesale_available, preorder_available, wholesale_moq, preorder_moq,
  preorder_fallback, estimated_delivery_days, is_featured, is_active,
  created_at, updated_at, seo_title, seo_description, video_url
) ON public.products TO anon;

-- Sequence used by generate_order_number()
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO authenticated, service_role;