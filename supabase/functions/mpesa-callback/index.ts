import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Receives Daraja STK Push callbacks. Always respond 200 with ResultCode 0 so
// Safaricom does not retry indefinitely — we log errors internally.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ok = () =>
    new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let body: any = null;
  try {
    body = await req.json();
  } catch (e) {
    console.error("mpesa-callback: invalid JSON", e);
    return ok();
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const stk = body?.Body?.stkCallback;
    if (!stk) { console.error("mpesa-callback: missing stkCallback", body); return ok(); }

    const resultCode = Number(stk.ResultCode);
    const resultDesc = String(stk.ResultDesc ?? "");
    const checkoutRequestId = String(stk.CheckoutRequestID ?? "");
    const merchantRequestId = String(stk.MerchantRequestID ?? "");

    const items: any[] = stk?.CallbackMetadata?.Item ?? [];
    const find = (n: string) => items.find((i: any) => i.Name === n)?.Value;
    const receipt = find("MpesaReceiptNumber") ? String(find("MpesaReceiptNumber")) : null;
    const amount = find("Amount") != null ? Number(find("Amount")) : null;
    const phone = find("PhoneNumber") != null ? String(find("PhoneNumber")) : null;

    // Match on the Daraja checkout request id (primary), fall back to merchant id.
    let { data: pay } = await admin
      .from("payments")
      .select("id,order_id")
      .eq("checkout_request_id", checkoutRequestId)
      .maybeSingle();
    if (!pay && merchantRequestId) {
      const r = await admin
        .from("payments")
        .select("id,order_id")
        .eq("merchant_request_id", merchantRequestId)
        .maybeSingle();
      pay = r.data ?? null;
    }
    if (!pay) {
      console.error("mpesa-callback: no matching payment", { checkoutRequestId, merchantRequestId });
      return ok();
    }

    const status = resultCode === 0 ? "completed" : (resultCode === 1032 ? "cancelled" : "failed");
    await admin
      .from("payments")
      .update({
        status,
        payment_reference: receipt,
        mpesa_receipt: receipt,
        result_desc: resultDesc,
        amount: amount ?? undefined,
        phone_number: phone ?? undefined,
        callback_response: body,
      })
      .eq("id", pay.id);

    if (pay.order_id) {
      if (resultCode === 0) {
        await admin
          .from("orders")
          .update({ payment_status: "paid", order_status: "confirmed" })
          .eq("id", pay.order_id);
      } else {
        await admin
          .from("orders")
          .update({ payment_status: status })
          .eq("id", pay.order_id);
      }
    }

    return ok();
  } catch (e) {
    console.error("mpesa-callback error", e);
    return ok();
  }
});