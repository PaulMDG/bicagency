-- Restore anon SELECT on products excluding supplier_id (column-level)
GRANT SELECT (id, category_id, name, slug, sku, description, retail_price, wholesale_price, preorder_price, retail_stock, wholesale_available, preorder_available, wholesale_moq, preorder_moq, preorder_fallback, estimated_delivery_days, is_featured, is_active, created_at, updated_at, subcategory_id, seo_title, seo_description, video_url) ON public.products TO anon;

GRANT SELECT (id, category_id, name, slug, sku, description, retail_price, wholesale_price, preorder_price, retail_stock, wholesale_available, preorder_available, wholesale_moq, preorder_moq, preorder_fallback, estimated_delivery_days, is_featured, is_active, created_at, updated_at, subcategory_id, seo_title, seo_description, video_url) ON public.products TO authenticated;

-- Admins still need full access for management via RLS-protected policies
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

-- Update store name in settings
UPDATE public.settings SET value = 'Blessmarked Shop' WHERE key = 'store_name';