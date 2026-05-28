import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Receives Daraja callbacks and updates payment + order status.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const stk = body?.Body?.stkCallback;
    const resultCode = stk?.ResultCode;
    const items = stk?.CallbackMetadata?.Item ?? [];
    const find = (n: string) => items.find((i: any) => i.Name === n)?.Value;
    const ref = find("MpesaReceiptNumber");
    const amount = find("Amount");
    const phone = String(find("PhoneNumber") ?? "");
    // Try to match by phone + amount + pending status (simple matching for stub)
    const { data: pay } = await admin.from("payments").select("id,order_id").eq("phone_number", phone).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (pay) {
      await admin.from("payments").update({ status: resultCode === 0 ? "completed" : "failed", payment_reference: ref ?? null, callback_response: body }).eq("id", pay.id);
      if (resultCode === 0 && pay.order_id) {
        await admin.from("orders").update({ payment_status: "paid", order_status: "confirmed" }).eq("id", pay.order_id);
      }
    }
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "OK" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: (e as Error).message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});