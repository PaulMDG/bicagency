
-- Role enum and user_roles table (separate from any profiles table)
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'))
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "admin manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  sku text UNIQUE,
  description text,
  retail_price numeric(12,2) NOT NULL,
  wholesale_price numeric(12,2),
  preorder_price numeric(12,2),
  retail_stock integer NOT NULL DEFAULT 0,
  wholesale_available boolean NOT NULL DEFAULT false,
  preorder_available boolean NOT NULL DEFAULT false,
  wholesale_moq integer NOT NULL DEFAULT 1,
  preorder_moq integer NOT NULL DEFAULT 1,
  preorder_fallback text NOT NULL DEFAULT 'retail',
  estimated_delivery_days integer,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "admin read all products" ON public.products FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin manage products" ON public.products FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Product images
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "admin manage product images" ON public.product_images FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  delivery_location text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.customers TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public can create customer" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "admin read customers" ON public.customers FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin manage customers" ON public.customers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Order number sequence
CREATE SEQUENCE public.order_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text LANGUAGE sql AS $$
  SELECT 'ORD-' || to_char(now(), 'YYYY') || lpad(nextval('public.order_number_seq')::text, 4, '0')
$$;

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id),
  order_number text UNIQUE NOT NULL DEFAULT public.generate_order_number(),
  purchase_type text NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  total numeric(12,2) NOT NULL,
  delivery_location text,
  order_notes text,
  payment_method text,
  payment_status text NOT NULL DEFAULT 'pending',
  order_status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public can create order" ON public.orders FOR INSERT WITH CHECK (true);
-- allow reading own order via order_number (for confirmation page)
CREATE POLICY "public read order by number" ON public.orders FOR SELECT USING (true);
CREATE POLICY "admin manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  purchase_type text NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  quantity integer NOT NULL,
  line_total numeric(12,2) NOT NULL
);
GRANT INSERT, SELECT ON public.order_items TO anon, authenticated;
GRANT UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "public read order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "admin manage order items" ON public.order_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  payment_reference text,
  phone_number text,
  amount numeric(12,2),
  status text NOT NULL DEFAULT 'pending',
  callback_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.payments TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public create payment" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "admin manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Settings  
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  "group" text,
  is_public boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read public settings" ON public.settings FOR SELECT USING (is_public = true);
CREATE POLICY "admin read all settings" ON public.settings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin manage settings" ON public.settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER products_touch BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- SEED categories
INSERT INTO public.categories (name, slug, description, image_url) VALUES
  ('Electronics', 'electronics', 'Phones, audio, and accessories.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800'),
  ('Fashion', 'fashion', 'Modern apparel and accessories.', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'),
  ('Home & Kitchen', 'home-kitchen', 'Essentials for the modern home.', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800');

-- SEED products
WITH cat AS (SELECT id, slug FROM public.categories)
INSERT INTO public.products (category_id, name, slug, sku, description, retail_price, wholesale_price, preorder_price, retail_stock, wholesale_available, preorder_available, wholesale_moq, preorder_moq, preorder_fallback, estimated_delivery_days, is_featured)
VALUES
  ((SELECT id FROM cat WHERE slug='electronics'),'Wireless Bluetooth Earbuds','wireless-bluetooth-earbuds','EL-EAR-001','Premium noise-cancelling earbuds with 24h battery life.',2500,1800,2200,40,true,false,10,1,'retail',NULL,true),
  ((SELECT id FROM cat WHERE slug='electronics'),'Smart 4K Android TV 55"','smart-4k-android-tv-55','EL-TV-055','55-inch 4K UHD Android TV with HDR and built-in Chromecast.',55000,NULL,49500,5,false,true,1,1,'block',21,true),
  ((SELECT id FROM cat WHERE slug='fashion'),'Heritage Leather Sneakers','heritage-leather-sneakers','FA-SHO-001','Hand-crafted leather sneakers, made in Kenya.',4500,3200,NULL,15,true,false,6,1,'retail',NULL,true),
  ((SELECT id FROM cat WHERE slug='fashion'),'Maasai Print Tote Bag','maasai-print-tote-bag','FA-BAG-002','Vibrant printed canvas tote with leather handles.',1200,NULL,NULL,80,false,false,1,1,'retail',NULL,false),
  ((SELECT id FROM cat WHERE slug='home-kitchen'),'Cast Iron Frying Pan 28cm','cast-iron-frying-pan-28cm','HK-PAN-028','Pre-seasoned heavy duty cast iron pan.',3200,2400,NULL,25,true,false,5,1,'retail',NULL,false),
  ((SELECT id FROM cat WHERE slug='home-kitchen'),'Espresso Coffee Machine','espresso-coffee-machine','HK-COF-001','15-bar pump espresso machine with milk frother.',14500,NULL,12500,0,false,true,1,1,'retail',14,true);

-- SEED product images
INSERT INTO public.product_images (product_id, image_url, sort_order, is_primary)
SELECT id, 
  CASE slug
    WHEN 'wireless-bluetooth-earbuds' THEN 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800'
    WHEN 'smart-4k-android-tv-55' THEN 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800'
    WHEN 'heritage-leather-sneakers' THEN 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'
    WHEN 'maasai-print-tote-bag' THEN 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800'
    WHEN 'cast-iron-frying-pan-28cm' THEN 'https://images.unsplash.com/photo-1584990347449-a89d4b1ec3e7?w=800'
    WHEN 'espresso-coffee-machine' THEN 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800'
  END,
  0, true
FROM public.products;

-- SEED settings
INSERT INTO public.settings (key, value, "group", is_public) VALUES
  ('store_name','Sokoni KE','store',true),
  ('store_tagline','Modern Kenyan commerce','store',true),
  ('contact_phone','+254700000000','store',true),
  ('contact_email','hello@store.co.ke','store',true),
  ('physical_address','Nairobi, Kenya','store',true),
  ('delivery_notes','Delivery within Nairobi: 1-2 days. Countrywide: 3-5 days.','store',true),
  ('currency','KES','store',true),
  ('social_facebook','','store',true),
  ('social_instagram','','store',true),
  ('social_tiktok','','store',true),
  ('whatsapp_number','254700000000','whatsapp',true),
  ('whatsapp_greeting','Hello! I''d like to ask about your products.','whatsapp',true),
  ('whatsapp_inquiry_template','Hi, I''m interested in *{product_name}* — Qty: {quantity} ({purchase_type}) at KES {price}.','whatsapp',true),
  ('whatsapp_order_template','New order *{order_number}* from {customer_name}.\n{items_summary}\nTotal: KES {total}','whatsapp',true),
  ('mpesa_environment','sandbox','mpesa',false),
  ('mpesa_consumer_key','','mpesa',false),
  ('mpesa_consumer_secret','','mpesa',false),
  ('mpesa_shortcode','174379','mpesa',false),
  ('mpesa_passkey','','mpesa',false);
