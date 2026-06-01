
-- ============ SUPPLIERS ============
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.suppliers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "public read active suppliers" ON public.suppliers FOR SELECT USING (is_active = true);
CREATE TRIGGER suppliers_touch BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ SUBCATEGORIES ============
CREATE TABLE public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);
GRANT SELECT ON public.subcategories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcategories TO authenticated;
GRANT ALL ON public.subcategories TO service_role;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage subcategories" ON public.subcategories FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "public read subcategories" ON public.subcategories FOR SELECT USING (true);

-- ============ BLOG POSTS ============
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content_html text NOT NULL DEFAULT '',
  cover_image_url text,
  author text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage blog_posts" ON public.blog_posts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "public read published blog_posts" ON public.blog_posts FOR SELECT USING (published = true);
CREATE TRIGGER blog_posts_touch BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX blog_posts_published_idx ON public.blog_posts (published, published_at DESC);

-- ============ CUSTOMER ACCOUNTS ============
CREATE TABLE public.customer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  default_delivery_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_accounts TO authenticated;
GRANT ALL ON public.customer_accounts TO service_role;
ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own account" ON public.customer_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own account" ON public.customer_accounts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own account" ON public.customer_accounts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin manage customer_accounts" ON public.customer_accounts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER customer_accounts_touch BEFORE UPDATE ON public.customer_accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ ALTER EXISTING TABLES ============
ALTER TABLE public.products ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN subcategory_id uuid REFERENCES public.subcategories(id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN sort_order int NOT NULL DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX customers_user_id_idx ON public.customers (user_id);

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images','product-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images','blog-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('category-images','category-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read product-images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "admin write product-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.is_admin(auth.uid()));
CREATE POLICY "admin update product-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.is_admin(auth.uid()));
CREATE POLICY "admin delete product-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.is_admin(auth.uid()));

CREATE POLICY "public read blog-images" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');
CREATE POLICY "admin write blog-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images' AND public.is_admin(auth.uid()));
CREATE POLICY "admin update blog-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'blog-images' AND public.is_admin(auth.uid()));
CREATE POLICY "admin delete blog-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'blog-images' AND public.is_admin(auth.uid()));

CREATE POLICY "public read category-images" ON storage.objects FOR SELECT USING (bucket_id = 'category-images');
CREATE POLICY "admin write category-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'category-images' AND public.is_admin(auth.uid()));
CREATE POLICY "admin update category-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'category-images' AND public.is_admin(auth.uid()));
CREATE POLICY "admin delete category-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'category-images' AND public.is_admin(auth.uid()));

-- ============ UPDATED place_order RPC (accepts auth_user_id) ============
CREATE OR REPLACE FUNCTION public.place_order(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric := 0;
  v_purchase_type text;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_unit_price numeric;
  v_qty int;
  v_line_total numeric;
  v_effective_type text;
  v_name text;
  v_phone text;
  v_user_id uuid;
BEGIN
  v_name := trim(coalesce(payload->'customer'->>'name',''));
  v_phone := trim(coalesce(payload->'customer'->>'phone',''));
  v_user_id := NULLIF(payload->>'auth_user_id','')::uuid;

  IF length(v_name) < 2 THEN RAISE EXCEPTION 'Customer name is required'; END IF;
  IF v_phone !~ '^254[17][0-9]{8}$' THEN RAISE EXCEPTION 'Invalid Kenyan phone'; END IF;
  IF jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  INSERT INTO public.customers (name, phone, email, delivery_location, user_id)
  VALUES (
    v_name, v_phone,
    NULLIF(payload->'customer'->>'email',''),
    payload->'customer'->>'delivery_location',
    v_user_id
  )
  RETURNING id INTO v_customer_id;

  v_purchase_type := coalesce(payload->>'purchase_type','retail');

  INSERT INTO public.orders (
    customer_id, purchase_type, subtotal, total,
    delivery_location, order_notes, payment_method, payment_status, order_status
  )
  VALUES (
    v_customer_id, v_purchase_type, 0, 0,
    payload->'customer'->>'delivery_location',
    NULLIF(payload->>'order_notes',''),
    payload->>'payment_method',
    'pending', 'new'
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    v_qty := (v_item->>'quantity')::int;
    IF v_qty < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND OR v_product.is_active = false THEN
      RAISE EXCEPTION 'Product unavailable';
    END IF;

    v_effective_type := v_item->>'purchase_type';

    IF v_effective_type = 'retail' THEN
      v_unit_price := v_product.retail_price;
      IF v_product.retail_stock < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for %: only % available', v_product.name, v_product.retail_stock;
      END IF;
      UPDATE public.products SET retail_stock = retail_stock - v_qty WHERE id = v_product.id;
    ELSIF v_effective_type = 'wholesale' THEN
      IF NOT v_product.wholesale_available OR v_product.wholesale_price IS NULL THEN
        RAISE EXCEPTION 'Wholesale not available for %', v_product.name;
      END IF;
      IF v_qty < v_product.wholesale_moq THEN
        RAISE EXCEPTION 'Wholesale MOQ for % is %', v_product.name, v_product.wholesale_moq;
      END IF;
      IF v_product.retail_stock < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for %: only % available', v_product.name, v_product.retail_stock;
      END IF;
      v_unit_price := v_product.wholesale_price;
      UPDATE public.products SET retail_stock = retail_stock - v_qty WHERE id = v_product.id;
    ELSIF v_effective_type = 'preorder' THEN
      IF NOT v_product.preorder_available THEN
        RAISE EXCEPTION 'Preorder not available for %', v_product.name;
      END IF;
      IF v_qty < v_product.preorder_moq THEN
        IF v_product.preorder_fallback = 'block' THEN
          RAISE EXCEPTION 'Preorder MOQ for % is %', v_product.name, v_product.preorder_moq;
        ELSE
          v_unit_price := v_product.retail_price;
          v_effective_type := 'retail';
        END IF;
      ELSE
        v_unit_price := COALESCE(v_product.preorder_price, v_product.retail_price);
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid purchase_type: %', v_effective_type;
    END IF;

    v_line_total := v_unit_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    INSERT INTO public.order_items (order_id, product_id, product_name, purchase_type, unit_price, quantity, line_total)
    VALUES (v_order_id, v_product.id, v_product.name, v_effective_type, v_unit_price, v_qty, v_line_total);
  END LOOP;

  UPDATE public.orders SET subtotal = v_subtotal, total = v_subtotal WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_subtotal
  );
END;
$function$;

-- ============ list_my_orders RPC ============
CREATE OR REPLACE FUNCTION public.list_my_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'order_status', o.order_status,
    'payment_status', o.payment_status,
    'purchase_type', o.purchase_type,
    'total', o.total,
    'created_at', o.created_at
  ) ORDER BY o.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id
  WHERE c.user_id = v_uid;
  RETURN v_rows;
END;
$$;
