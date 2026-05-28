import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// TODO: Replace this stub with a real Daraja STK Push call.
// Steps:
//  1. Fetch settings (consumer_key, consumer_secret, shortcode, passkey, environment) from `settings` table.
//  2. POST {consumer_key}:{consumer_secret} to /oauth/v1/generate?grant_type=client_credentials → access_token
//  3. POST to /mpesa/stkpush/v1/processrequest with timestamp + password and callback URL.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { order_id, phone, amount } = await req.json();
    console.log("[mpesa-stk-push:stub]", { order_id, phone, amount });
    return new Response(JSON.stringify({ ok: true, simulated: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});