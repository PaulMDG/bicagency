-- 1) Restrict anon read on products to non-sensitive columns (exclude supplier_id)
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (
  id, category_id, subcategory_id, name, slug, sku, description,
  retail_price, wholesale_price, preorder_price, retail_stock,
  wholesale_available, preorder_available, wholesale_moq, preorder_moq,
  preorder_fallback, estimated_delivery_days, is_featured, is_active,
  created_at, updated_at, seo_title, seo_description, video_url
) ON public.products TO anon;

-- 2) Explicit admin-only DELETE policy on customer_accounts
CREATE POLICY "admin delete customer_accounts"
ON public.customer_accounts
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- 3) Pin search_path on generate_order_number
ALTER FUNCTION public.generate_order_number() SET search_path = public;
