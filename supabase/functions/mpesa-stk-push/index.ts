import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function pad(n: number) { return n.toString().padStart(2, "0"); }
function timestampNow() {
  const d = new Date();
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (/^254[17]\d{8}$/.test(d)) return d;
  if (/^0[17]\d{8}$/.test(d)) return "254" + d.slice(1);
  if (/^[17]\d{8}$/.test(d)) return "254" + d;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { order_id, phone, amount } = await req.json();
    if (!order_id || !phone || !amount) return json({ error: "order_id, phone, amount required" }, 400);

    const phoneNorm = normalizePhone(String(phone));
    if (!phoneNorm) return json({ error: "Invalid Kenyan phone" }, 400);

    const env = (Deno.env.get("MPESA_ENVIRONMENT") ?? "sandbox").toLowerCase();
    const baseUrl = env === "live" || env === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL");
    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
      return json({ error: "M-Pesa credentials are not configured" }, 500);
    }

    // 1. OAuth token
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      console.error("Daraja OAuth failed", tokenRes.status, t);
      return json({ error: "Failed to authenticate with M-Pesa" }, 502);
    }
    const { access_token } = await tokenRes.json();

    // 2. STK Push
    const timestamp = timestampNow();
    const password = btoa(`${shortcode}${passkey}${timestamp}`);
    const amountInt = Math.max(1, Math.round(Number(amount)));
    const stkBody = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amountInt,
      PartyA: phoneNorm,
      PartyB: shortcode,
      PhoneNumber: phoneNorm,
      CallBackURL: callbackUrl,
      AccountReference: String(order_id).slice(0, 12),
      TransactionDesc: `Order ${String(order_id).slice(0, 8)}`,
    };
    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(stkBody),
    });
    const stkData = await stkRes.json();
    if (!stkRes.ok || stkData.ResponseCode !== "0") {
      console.error("STK push failed", stkData);
      return json({ error: stkData.errorMessage ?? stkData.ResponseDescription ?? "STK Push failed", details: stkData }, 502);
    }

    // 3. Record the pending payment
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("payments").insert({
      order_id,
      phone_number: phoneNorm,
      amount: amountInt,
      status: "pending",
      checkout_request_id: stkData.CheckoutRequestID,
      merchant_request_id: stkData.MerchantRequestID,
    });

    return json({
      ok: true,
      checkout_request_id: stkData.CheckoutRequestID,
      merchant_request_id: stkData.MerchantRequestID,
      message: stkData.CustomerMessage,
    });
  } catch (e) {
    console.error("stk-push error", e);
    return json({ error: (e as Error).message }, 500);
  }
});