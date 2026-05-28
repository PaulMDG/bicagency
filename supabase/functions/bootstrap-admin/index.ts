import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user_id } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { count } = await admin.from("user_roles").select("id", { count: "exact", head: true }).in("role", ["admin", "super_admin"]);
    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "An admin already exists" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { error } = await admin.from("user_roles").insert({ user_id, role: "super_admin" });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});