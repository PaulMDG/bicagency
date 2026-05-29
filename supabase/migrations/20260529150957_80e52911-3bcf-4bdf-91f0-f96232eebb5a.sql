
-- Daraja tracking columns on payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS checkout_request_id text,
  ADD COLUMN IF NOT EXISTS merchant_request_id text,
  ADD COLUMN IF NOT EXISTS mpesa_receipt text,
  ADD COLUMN IF NOT EXISTS result_desc text;
CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id ON public.payments(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active_featured ON public.products(is_active, is_featured);

-- Atomic place_order RPC
CREATE OR REPLACE FUNCTION public.place_order(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  v_name := trim(coalesce(payload->'customer'->>'name',''));
  v_phone := trim(coalesce(payload->'customer'->>'phone',''));
  IF length(v_name) < 2 THEN RAISE EXCEPTION 'Customer name is required'; END IF;
  IF v_phone !~ '^254[17][0-9]{8}$' THEN RAISE EXCEPTION 'Invalid Kenyan phone'; END IF;
  IF jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  INSERT INTO public.customers (name, phone, email, delivery_location)
  VALUES (
    v_name, v_phone,
    NULLIF(payload->'customer'->>'email',''),
    payload->'customer'->>'delivery_location'
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
      -- preorders do NOT decrement retail_stock
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
$$;

GRANT EXECUTE ON FUNCTION public.place_order(jsonb) TO anon, authenticated;

-- Tighten public RLS on orders: stop exposing all orders to anon.
DROP POLICY IF EXISTS "public read order by number" ON public.orders;

-- Secure tracking lookup
CREATE OR REPLACE FUNCTION public.track_order(p_order_number text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_order record;
  v_items jsonb;
  v_payment record;
BEGIN
  v_phone := regexp_replace(coalesce(p_phone,''), '\D', '', 'g');
  IF v_phone ~ '^0[17][0-9]{8}$' THEN v_phone := '254' || substring(v_phone from 2); END IF;
  IF v_phone !~ '^254[17][0-9]{8}$' THEN
    RETURN jsonb_build_object('error','Invalid phone');
  END IF;

  SELECT o.id, o.order_number, o.order_status, o.payment_status, o.payment_method,
         o.purchase_type, o.subtotal, o.total, o.delivery_location, o.created_at,
         o.updated_at, c.name as customer_name, c.phone as customer_phone
    INTO v_order
  FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id
  WHERE upper(o.order_number) = upper(trim(p_order_number)) AND c.phone = v_phone;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error','No order found matching that order number and phone.');
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'product_name', product_name, 'purchase_type', purchase_type,
    'quantity', quantity, 'unit_price', unit_price, 'line_total', line_total
  )), '[]'::jsonb) INTO v_items
  FROM public.order_items WHERE order_id = v_order.id;

  SELECT status, payment_reference, mpesa_receipt, created_at
    INTO v_payment
  FROM public.payments WHERE order_id = v_order.id
  ORDER BY created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', v_items,
    'payment', CASE WHEN v_payment IS NULL THEN NULL ELSE to_jsonb(v_payment) END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated;
