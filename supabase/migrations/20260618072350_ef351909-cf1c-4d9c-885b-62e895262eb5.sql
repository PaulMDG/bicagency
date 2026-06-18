DROP POLICY IF EXISTS "public read order items" ON public.order_items;
DROP POLICY IF EXISTS "public read active suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "public manage order items" ON public.order_items;
DROP POLICY IF EXISTS "public create payment" ON public.payments;
DROP POLICY IF EXISTS "public can create order" ON public.orders;
DROP POLICY IF EXISTS "public can create customer" ON public.customers;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.place_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.track_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.list_my_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_orders() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_order_payment_status(p_order_id uuid, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_row record;
BEGIN
  v_phone := regexp_replace(coalesce(p_phone,''), '\D', '', 'g');
  IF v_phone ~ '^0[17][0-9]{8}$' THEN v_phone := '254' || substring(v_phone from 2); END IF;
  IF v_phone !~ '^254[17][0-9]{8}$' THEN RETURN jsonb_build_object('error','invalid_phone'); END IF;

  SELECT o.payment_status, o.order_status
    INTO v_row
  FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id
  WHERE o.id = p_order_id AND c.phone = v_phone;

  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  RETURN jsonb_build_object(
    'payment_status', v_row.payment_status,
    'order_status', v_row.order_status
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.get_order_payment_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_payment_status(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_settings_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW."group" IN ('mpesa','secrets','admin','payments') THEN
    NEW.is_public := false;
  END IF;
  IF NEW.key ILIKE '%secret%' OR NEW.key ILIKE '%passkey%' OR NEW.key ILIKE '%api_key%'
     OR NEW.key ILIKE '%consumer_key%' OR NEW.key ILIKE '%shortcode%' OR NEW.key ILIKE '%token%' THEN
    NEW.is_public := false;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_settings_visibility ON public.settings;
CREATE TRIGGER trg_enforce_settings_visibility
  BEFORE INSERT OR UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_settings_visibility();

UPDATE public.settings SET is_public = false
WHERE "group" IN ('mpesa','secrets','admin','payments')
   OR key ILIKE ANY (ARRAY['%secret%','%passkey%','%api_key%','%consumer_key%','%shortcode%','%token%']);